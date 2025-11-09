package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.dominio.AplicacionAnticipo;
import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.dominio.Venta;
import com.soyanga.soyangabackend.dto.cobros.AplicarAnticipoDTO;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionAnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaRepositorio;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnticipoConversionServicio {

    private final AnticipoRepositorio anticipoRepo;
    private final AnticipoDetalleRepositorio anticipoDetRepo;
    private final VentaRepositorio ventaRepo;

    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;

    private final AplicacionAnticipoRepositorio aplicacionAnticipoRepo;
    private final AnticipoAplicacionServicio anticipoAplicacionServicio; // aplica en CRÉDITO

    /** Caso general: usa una venta existente, consume reservas y aplica anticipo (contado o crédito). */
    @Transactional
    public Map<String, Object> convertirEnVenta(Long idAnticipo, Long idVenta, BigDecimal montoAplicarBob) {
        var res = convertirYAplicar(idAnticipo, Req.builder()
                .idVenta(idVenta)
                .aplicarAnticipo(true)
                .montoAplicarBob(montoAplicarBob)
                .build());

        var v = ventaRepo.findById(idVenta).orElse(null);
        String modo = (v != null && esVentaCredito(v)) ? "credito" : "contado";
        return toRespuesta(modo, res);
    }

    /* ==================== Núcleo ==================== */
    @Transactional
    protected Resultado convertirYAplicar(Long idAnticipo, Req req) {
        Anticipo anti = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anticipo no encontrado"));
        if (anti.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El anticipo está anulado");
        }

        Venta venta = ventaRepo.findById(req.getIdVenta())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada"));
        if (anti.getIdCliente() != null && !anti.getIdCliente().equals(venta.getIdCliente())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El anticipo pertenece a otro cliente");
        }

        // 1) consumir TODAS las reservas vigentes del anticipo → salida_venta (referenciada a la venta)
        List<MovimientoInventarioRepositorio.ReservaVigenteRow> reservas =
                movRepo.reservasVigentesPorAnticipo(idAnticipo);

        BigDecimal totalUnidades = BigDecimal.ZERO;
        boolean huboConsumoReserva = false;

        for (var r : reservas) {
            Long idAlm = r.getIdAlmacen();
            Long idLote = r.getIdLote();
            BigDecimal qty = r.getCantidad();
            if (qty == null || qty.signum() <= 0) continue;

            var ex = existenciaRepo.lockByAlmacenAndIdLote(idAlm, idLote)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "Existencia no encontrada para almacén " + idAlm + " y lote " + idLote));

            if (ex.getCantidadReservada().compareTo(qty) < 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Reserva inconsistente (reservada < a consumir) en lote " + idLote);
            }

            ex.setCantidadReservada(ex.getCantidadReservada().subtract(qty));
            ex.setFechaUltimaActualizacion(LocalDateTime.now());
            existenciaRepo.save(ex);

            movRepo.save(MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.salida_venta)
                    .idAlmacenOrigen(idAlm)
                    .idAlmacenDestino(null)
                    .idLote(idLote)
                    .cantidad(qty)
                    .referenciaModulo("venta")
                    .idReferencia(venta.getIdVenta())
                    .observaciones("Consumo de reserva por anticipo " + idAnticipo)
                    .build());

            totalUnidades = totalUnidades.add(qty);
            huboConsumoReserva = true;
        }

        // poner reservada=0 en detalles del anticipo (si hubo reservas listadas)
        if (!reservas.isEmpty()) {
            var dets = anticipoDetRepo.findByIdAnticipo(idAnticipo);
            for (var d : dets) d.setCantidadReservada(BigDecimal.ZERO);
            anticipoDetRepo.saveAll(dets);
        }

        // 2) aplicar anticipo
        BigDecimal aplicado = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(req.getAplicarAnticipo())) {
            BigDecimal saldo = saldoDisponible(idAnticipo);
            BigDecimal monto = req.getMontoAplicarBob();
            if (monto == null || monto.signum() <= 0) {
                monto = saldo; // por defecto todo el saldo
            } else if (monto.compareTo(saldo) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Monto a aplicar excede saldo del anticipo (" + saldo + ")");
            }

            if (esVentaCredito(venta)) {
                var resp = anticipoAplicacionServicio.aplicar(idAnticipo, new AplicarAnticipoDTO(venta.getIdVenta(), monto));
                aplicado = resp.getMontoAplicadoBob(); // valida contra pendiente de CxC
            } else {
                // Contado: solo trazabilidad (no hay CxC). El descuento ya lo maneja FE en “A cobrar”.
                var apl = AplicacionAnticipo.builder()
                        .idAnticipo(idAnticipo)
                        .idVenta(venta.getIdVenta())
                        .montoAplicadoBob(monto)
                        .fechaAplicacion(LocalDateTime.now())
                        .build();
                aplicacionAnticipoRepo.save(apl);
                aplicado = monto;

                // actualizar estado considerando si hubo consumo de reserva
                actualizarEstado(anti, huboConsumoReserva);
            }
        } else if (huboConsumoReserva) {
            // si no aplicó dinero pero sí consumió reservas, marcar transferido_a_venta
            marcarTransferidoSiCorresponde(anti);
        }

        // Ajuste final: si hubo consumo reserva y aún no quedó aplicado_total, asegurar transferido_a_venta
        if (huboConsumoReserva) {
            var ref = anticipoRepo.findById(idAnticipo).orElse(anti);
            if (ref.getEstadoAnticipo() != Anticipo.EstadoAnticipo.aplicado_total) {
                marcarTransferidoSiCorresponde(ref);
            }
        }

        return Resultado.builder()
                .idAnticipo(idAnticipo)
                .idVenta(venta.getIdVenta())
                .reservasConsumidas(reservas.size())
                .unidadesConsumidas(totalUnidades)
                .montoAplicado(aplicado)
                .build();
    }

    /* ============== helpers ============== */

    private BigDecimal saldoDisponible(Long idAnticipo) {
        var a = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anticipo no encontrado"));
        BigDecimal aplicadoHist = aplicacionAnticipoRepo.totalAplicadoPorAnticipo(idAnticipo);
        if (aplicadoHist == null) aplicadoHist = BigDecimal.ZERO;
        return a.getMontoBob().subtract(aplicadoHist).max(BigDecimal.ZERO);
    }

    private boolean esVentaCredito(Venta v) {
        try {
            return v.getCondicionDePago() == Venta.CondicionPago.credito;
        } catch (Exception ignore) {
            return v.getCondicionDePago() != null &&
                    v.getCondicionDePago().name().equalsIgnoreCase("credito");
        }
    }

    private void marcarTransferidoSiCorresponde(Anticipo a) {
        BigDecimal aplicadoHist = aplicacionAnticipoRepo.totalAplicadoPorAnticipo(a.getIdAnticipo());
        if (aplicadoHist == null) aplicadoHist = BigDecimal.ZERO;
        BigDecimal saldo = a.getMontoBob().subtract(aplicadoHist);
        Anticipo.EstadoAnticipo nuevo = (saldo.signum() == 0)
                ? Anticipo.EstadoAnticipo.aplicado_total
                : Anticipo.EstadoAnticipo.transferido_a_venta;
        if (a.getEstadoAnticipo() != nuevo) {
            a.setEstadoAnticipo(nuevo);
            anticipoRepo.save(a);
        }
    }

    private void actualizarEstado(Anticipo a, boolean huboConsumoReserva) {
        BigDecimal aplicadoHist = aplicacionAnticipoRepo.totalAplicadoPorAnticipo(a.getIdAnticipo());
        if (aplicadoHist == null) aplicadoHist = BigDecimal.ZERO;
        BigDecimal saldo = a.getMontoBob().subtract(aplicadoHist);

        Anticipo.EstadoAnticipo nuevo;
        if (saldo.signum() == 0) {
            nuevo = Anticipo.EstadoAnticipo.aplicado_total;
        } else if (huboConsumoReserva) {
            nuevo = Anticipo.EstadoAnticipo.transferido_a_venta;
        } else {
            nuevo = (aplicadoHist.signum() > 0)
                    ? Anticipo.EstadoAnticipo.parcialmente_aplicado
                    : Anticipo.EstadoAnticipo.registrado;
        }

        if (a.getEstadoAnticipo() != nuevo) {
            a.setEstadoAnticipo(nuevo);
            anticipoRepo.save(a);
        }
    }

    /* ===== DTOs del caso de uso interno ===== */
    @Data @Builder
    public static class Req {
        private Long idVenta;
        private Boolean aplicarAnticipo;     // default true
        private BigDecimal montoAplicarBob;  // null => todo saldo
    }

    @Data @Builder
    public static class Resultado {
        private Long idAnticipo;
        private Long idVenta;
        private int reservasConsumidas;
        private BigDecimal unidadesConsumidas;
        private BigDecimal montoAplicado;
    }

    /* ===== Respuesta amigable para el controlador ===== */
    private Map<String, Object> toRespuesta(String modo, Resultado r) {
        var out = new java.util.LinkedHashMap<String, Object>();
        out.put("modo", modo);
        out.put("idAnticipo", r.getIdAnticipo());
        out.put("idVenta", r.getIdVenta());
        out.put("lotesConsumidos", r.getReservasConsumidas());
        out.put("unidadesConsumidas", r.getUnidadesConsumidas());
        out.put("aplicadoEnEstaOperacion", r.getMontoAplicado());

        var aplicadoAcum = aplicacionAnticipoRepo.totalAplicadoPorAnticipo(r.getIdAnticipo());
        if (aplicadoAcum == null) aplicadoAcum = BigDecimal.ZERO;
        out.put("aplicadoAcumulado", aplicadoAcum);

        var anti = anticipoRepo.findById(r.getIdAnticipo()).orElse(null);
        var saldo = (anti != null ? anti.getMontoBob() : BigDecimal.ZERO).subtract(aplicadoAcum);
        if (saldo.signum() < 0) saldo = BigDecimal.ZERO;
        out.put("saldoAnticipoDespues", saldo);

        return out;
    }
}
