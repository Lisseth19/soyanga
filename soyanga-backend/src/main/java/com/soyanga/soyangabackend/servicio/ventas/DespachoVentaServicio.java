package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.dominio.Venta;
import com.soyanga.soyangabackend.dominio.VentaDetalle;
import com.soyanga.soyangabackend.dominio.VentaDetalleLote;
import com.soyanga.soyangabackend.dominio.ExistenciaPorLote;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaDetalleLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DespachoVentaServicio {

    private final VentaRepositorio ventaRepo;
    private final VentaDetalleRepositorio vdRepo;
    private final VentaDetalleLoteRepositorio vdlRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;

    @Transactional
    public Map<String, Object> despachar(Long idVenta) {
        var venta = ventaRepo.findById(idVenta)
                .orElseThrow(() -> new IllegalArgumentException("Venta no encontrada: " + idVenta));

        if (venta.getEstadoVenta() == Venta.EstadoVenta.anulada) {
            throw new IllegalArgumentException("La venta está anulada");
        }
        if (venta.getEstadoVenta() == Venta.EstadoVenta.despachada) {
            throw new IllegalArgumentException("La venta ya fue despachada");
        }
        if (venta.getIdAlmacenDespacho() == null) {
            throw new IllegalArgumentException("id_almacen_despacho es requerido en la venta");
        }

        Long idAlmacen = venta.getIdAlmacenDespacho();
        var detalles = vdRepo.findByIdVentaOrderByIdVentaDetalleAsc(venta.getIdVenta());
        if (detalles.isEmpty()) {
            throw new IllegalStateException("La venta no tiene detalles");
        }

        // Para resumen de respuesta
        var consumosPorLote = new LinkedHashMap<Long, BigDecimal>(); // idLote -> cantidad
        var movimientos = new ArrayList<Long>();                     // ids de kardex

        for (VentaDetalle det : detalles) {
            BigDecimal restante = det.getCantidad();
            if (restante == null || restante.signum() <= 0) continue;

            // FEFO por presentación (candidatos)
            var candidatos = existenciaRepo.fefoCandidatosPorPresentacion(idAlmacen, det.getIdPresentacion());
            if (candidatos.isEmpty()) {
                throw new IllegalStateException("Sin stock (reservado/disponible) para presentacion " + det.getIdPresentacion());
            }

            for (ExistenciaPorLote cand : candidatos) {
                if (restante.signum() == 0) break;

                // Lock fila exacta (evita carreras)
                var exOpt = existenciaRepo.lockByAlmacenAndIdLote(idAlmacen, cand.getIdLote());
                var ex = exOpt.orElseThrow(() -> new IllegalStateException("Existencia no encontrada para lote " + cand.getIdLote()));

                // 1) Consumir RESERVA primero
                BigDecimal usarReserva = ex.getCantidadReservada().min(restante);
                if (usarReserva.signum() > 0) {
                    ex.setCantidadReservada(ex.getCantidadReservada().subtract(usarReserva));
                    existenciaRepo.save(ex);

                    // Trazabilidad por lote
                    var vdl = VentaDetalleLote.builder()
                            .idVentaDetalle(det.getIdVentaDetalle())
                            .idLote(ex.getIdLote())
                            .cantidad(usarReserva)
                            .build();
                    vdlRepo.save(vdl);

                    // Kárdex: salida_venta (del reservado → vendido)
                    var mov = MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.salida_venta)
                            .idAlmacenOrigen(idAlmacen)
                            .idAlmacenDestino(null)
                            .idLote(ex.getIdLote())
                            .cantidad(usarReserva) // negativo/positivo? Registramos POSITIVO y el tipo define sentido
                            .referenciaModulo("venta")
                            .idReferencia(idVenta)
                            .observaciones("Despacho (consumo de reserva)")
                            .build();
                    movRepo.save(mov);
                    movimientos.add(mov.getIdMovimiento());

                    consumosPorLote.merge(ex.getIdLote(), usarReserva, BigDecimal::add);
                    restante = restante.subtract(usarReserva);
                }

                if (restante.signum() == 0) break;

                // 2) Consumir DISPONIBLE (si aún falta)
                BigDecimal usarDisp = ex.getCantidadDisponible().min(restante);
                if (usarDisp.signum() > 0) {
                    ex.setCantidadDisponible(ex.getCantidadDisponible().subtract(usarDisp));
                    existenciaRepo.save(ex);

                    // Trazabilidad por lote
                    var vdl = VentaDetalleLote.builder()
                            .idVentaDetalle(det.getIdVentaDetalle())
                            .idLote(ex.getIdLote())
                            .cantidad(usarDisp)
                            .build();
                    vdlRepo.save(vdl);

                    // Kárdex: salida_venta (del disponible → vendido)
                    var mov = MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.salida_venta)
                            .idAlmacenOrigen(idAlmacen)
                            .idAlmacenDestino(null)
                            .idLote(ex.getIdLote())
                            .cantidad(usarDisp)
                            .referenciaModulo("venta")
                            .idReferencia(idVenta)
                            .observaciones("Despacho (consumo de disponible)")
                            .build();
                    movRepo.save(mov);
                    movimientos.add(mov.getIdMovimiento());

                    consumosPorLote.merge(ex.getIdLote(), usarDisp, BigDecimal::add);
                    restante = restante.subtract(usarDisp);
                }
            }

            if (restante.signum() > 0) {
                throw new IllegalStateException("Stock insuficiente para presentacion " + det.getIdPresentacion()
                        + " — faltante: " + restante);
            }
        }

        // Cambiar estado venta → despachada
        venta.setEstadoVenta(Venta.EstadoVenta.despachada);
        ventaRepo.save(venta);

        // Resumen
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("ventaId", idVenta);
        resp.put("estadoNuevo", venta.getEstadoVenta().name());
        resp.put("almacenDespacho", idAlmacen);
        resp.put("lotesConsumidos", consumosPorLote);
        resp.put("movimientosGenerados", movimientos);
        return resp;
    }
}
