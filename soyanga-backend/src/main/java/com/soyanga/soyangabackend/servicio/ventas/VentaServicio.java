// VentaServicio.java
package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.ventas.VentaCrearDTO;
import com.soyanga.soyangabackend.dto.ventas.VentaRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.precios.ImpuestoRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;

import static com.soyanga.soyangabackend.dominio.CuentaPorCobrar.EstadoCuenta;

@Service
@RequiredArgsConstructor
public class VentaServicio {

    private final VentaRepositorio ventaRepo;
    private final VentaDetalleRepositorio ventaDetRepo;
    private final VentaDetalleLoteRepositorio ventaDetLoteRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;

    private final AplicacionPagoRepositorio aplPagoRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;
    private final PresentacionProductoRepositorio presentacionRepo;

    private final ImpuestoRepositorio impuestoRepo;

    @PersistenceContext
    private EntityManager em;

    // =========================================================================
    // CONFIG: semántica de la reserva en inventario.
    // true  -> Al RESERVAR ya se descontó cantidad_disponible. En la VENTA: sólo se baja cantidad_reservada.
    // false -> Al RESERVAR NO se descontó cantidad_disponible. En la VENTA: se baja reservada y disponible.
    // =========================================================================
    private static final boolean RESERVA_DESCUENTA_DISPONIBLE_AL_RESERVAR = true;

    // ===================== helpers =====================
    private static <E extends Enum<E>> E parseEnumLower(Class<E> enumType, String value, String campo) {
        if (value == null) {
            throw new IllegalArgumentException("El campo " + campo + " es requerido");
        }
        try {
            return Enum.valueOf(enumType, value.trim().toLowerCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Valor inválido para " + campo + ": " + value);
        }
    }

    private static String pad6(long n) {
        return String.format("%06d", n);
    }

    /** Genera B-000001 o F-000001 desde las secuencias boleta_seq/factura_seq */
    private String generarNumeroDocumento(Venta.TipoDocumentoTributario tipo) {
        String seq = (tipo == Venta.TipoDocumentoTributario.boleta) ? "boleta_seq" : "factura_seq";
        String pref = (tipo == Venta.TipoDocumentoTributario.boleta) ? "B-" : "F-";
        Long next = ((Number) em.createNativeQuery("SELECT nextval('" + seq + "')").getSingleResult()).longValue();
        return pref + pad6(next);
    }

    private BigDecimal resolverImpuestoPct(Long impuestoId) {
        if (impuestoId != null) {
            var imp = impuestoRepo.findById(impuestoId)
                    .orElseThrow(() -> new IllegalArgumentException("Impuesto no encontrado: " + impuestoId));
            if (Boolean.FALSE.equals(imp.getEstadoActivo())) {
                throw new IllegalArgumentException("El impuesto seleccionado no está activo");
            }
            return imp.getPorcentaje() != null ? imp.getPorcentaje() : BigDecimal.ZERO;
        }
        var page = impuestoRepo.listar(null, true, PageRequest.of(0, 1));
        if (page.isEmpty()) {
            throw new IllegalStateException("No hay impuestos activos configurados");
        }
        var p = page.getContent().get(0);
        return p.getPorcentaje() != null ? p.getPorcentaje() : BigDecimal.ZERO;
    }

    // ====== Previsualizar el próximo número sin consumir la secuencia ======
    @Transactional(readOnly = true)
    public String peekProximoNumeroPorTipo(String tipoRaw) {
        var tipo = parseEnumLower(Venta.TipoDocumentoTributario.class, tipoRaw, "tipo");
        return peekProximoNumero(tipo);
    }

    private String peekProximoNumero(Venta.TipoDocumentoTributario tipo) {
        final String seq = (tipo == Venta.TipoDocumentoTributario.boleta) ? "boleta_seq" : "factura_seq";
        final String pref = (tipo == Venta.TipoDocumentoTributario.boleta) ? "B-" : "F-";
        // Algunos drivers no aceptan parámetros nombrados en nativas -> interpolamos el nombre de la secuencia.
        String sql = """
            SELECT CASE WHEN is_called THEN last_value + increment_by ELSE last_value END AS next_val
            FROM pg_sequences
            WHERE schemaname = 'public' AND sequencename = '%s'
        """.formatted(seq);

        Number nextVal = (Number) em.createNativeQuery(sql).getSingleResult();
        if (nextVal == null) {
            throw new IllegalStateException("Secuencia no encontrada: " + seq);
        }
        return pref + pad6(nextVal.longValue());
    }

    // ===================== casos de uso =====================
    @Transactional
    public VentaRespuestaDTO crear(VentaCrearDTO dto) {

        // ===== Validaciones previas =====
        if ("credito".equalsIgnoreCase(dto.getCondicionDePago()) &&
                dto.getFechaVencimientoCredito() == null) {
            throw new IllegalArgumentException("Para ventas a crédito, fechaVencimientoCredito es obligatoria");
        }
        if ("factura".equalsIgnoreCase(dto.getTipoDocumentoTributario()) &&
                dto.getIdCliente() == null) {
            throw new IllegalArgumentException("Para FACTURA, el cliente es obligatorio");
        }

        var fecha = dto.getFechaVenta() != null ? dto.getFechaVenta() : LocalDateTime.now();

        var tipoDoc = parseEnumLower(Venta.TipoDocumentoTributario.class,
                dto.getTipoDocumentoTributario(),"tipoDocumentoTributario");

        var metodo = dto.getMetodoDePago() != null
                ? parseEnumLower(Venta.MetodoDePago.class, dto.getMetodoDePago(), "metodoDePago")
                : Venta.MetodoDePago.efectivo;

        var condicion = parseEnumLower(Venta.CondicionPago.class, dto.getCondicionDePago(),"condicionDePago");

        var estado = Venta.EstadoVenta.confirmada;

        // Interés (PORCENTAJE, opcional). Ej: 5 = 5%
        BigDecimal interesCreditoPct = dto.getInteresCredito() != null ? dto.getInteresCredito() : BigDecimal.ZERO;
        if (interesCreditoPct.signum() < 0) interesCreditoPct = BigDecimal.ZERO;

        // ===== Numeración: B-000001 / F-000001 (sin tabla, con secuencia) =====
        String numeroDocumento = null;
        int retries = 2;
        while (retries-- >= 0) {
            numeroDocumento = generarNumeroDocumento(tipoDoc);
            try {
                var venta = Venta.builder()
                        .fechaVenta(fecha)
                        .idCliente(dto.getIdCliente())
                        .tipoDocumentoTributario(tipoDoc)
                        .numeroDocumento(numeroDocumento)
                        .idMoneda(1L)
                        .totalBrutoBob(BigDecimal.ZERO)
                        .descuentoTotalBob(BigDecimal.ZERO)
                        .totalNetoBob(BigDecimal.ZERO)
                        .metodoDePago(metodo)
                        .condicionDePago(condicion)
                        .interesCredito(interesCreditoPct)
                        .fechaVencimientoCredito(dto.getFechaVencimientoCredito())
                        .idAlmacenDespacho(dto.getIdAlmacenDespacho())
                        .estadoVenta(estado)
                        .observaciones(dto.getObservaciones())
                        .build();

                venta = ventaRepo.save(venta);

                var asignaciones = new ArrayList<VentaRespuestaDTO.ItemAsignado>();
                BigDecimal totalBruto = BigDecimal.ZERO;
                BigDecimal totalDesc = BigDecimal.ZERO;

                for (var it : dto.getItems()) {
                    var present = presentacionRepo.findById(it.getIdPresentacion())
                            .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada: " + it.getIdPresentacion()));

                    BigDecimal precioUnit = it.getPrecioUnitarioBob() != null ? it.getPrecioUnitarioBob() : present.getPrecioVentaBob();
                    if (precioUnit == null) precioUnit = BigDecimal.ZERO;

                    BigDecimal descPct = it.getDescuentoPorcentaje() != null ? it.getDescuentoPorcentaje() : BigDecimal.ZERO;
                    BigDecimal descMonto = it.getDescuentoMontoBob() != null ? it.getDescuentoMontoBob() : BigDecimal.ZERO;

                    var det = VentaDetalle.builder()
                            .idVenta(venta.getIdVenta())
                            .idPresentacion(it.getIdPresentacion())
                            .cantidad(it.getCantidad())
                            .precioUnitarioBob(precioUnit)
                            .descuentoPorcentaje(descPct)
                            .descuentoMontoBob(descMonto)
                            .subtotalBob(BigDecimal.ZERO)
                            .build();
                    det = ventaDetRepo.save(det);

                    // ======= Camino 1: vienen LOTES => consumir RESERVA de esos lotes =======
                    boolean conLotes = it.getLotes() != null && !it.getLotes().isEmpty();

                    if (conLotes) {
                        if (it.getIdAlmacenOrigen() == null) {
                            throw new IllegalArgumentException("idAlmacenOrigen es requerido cuando se informan lotes.");
                        }

                        BigDecimal sumaLotes = it.getLotes().stream()
                                .map(VentaCrearDTO.LoteConsumo::getCantidad)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        if (sumaLotes.compareTo(it.getCantidad()) != 0) {
                            throw new IllegalArgumentException("La suma de lotes no coincide con la cantidad del ítem.");
                        }

                        for (var lc : it.getLotes()) {
                            var exLock = existenciaRepo
                                    .lockByAlmacenAndIdLote(it.getIdAlmacenOrigen(), lc.getIdLote())
                                    .orElseThrow(() -> new IllegalArgumentException(
                                            "No existe existencia para almacén " + it.getIdAlmacenOrigen() +
                                                    " y lote " + lc.getIdLote()));

                            // ======== CONSUMIR RESERVA (y opcionalmente disponible, según tu modelo) ========
                            BigDecimal reservado = (exLock.getCantidadReservada() == null) ? BigDecimal.ZERO : exLock.getCantidadReservada();
                            if (reservado.compareTo(lc.getCantidad()) < 0) {
                                throw new IllegalArgumentException(
                                        "Reserva insuficiente en el lote " + lc.getIdLote()
                                                + " del almacén " + it.getIdAlmacenOrigen()
                                                + " (reservado: " + reservado + ", requerido: " + lc.getCantidad() + ")");
                            }

                            // 1) Siempre bajamos la columna de RESERVA
                            exLock.setCantidadReservada(reservado.subtract(lc.getCantidad()));

                            // 2) Si al reservar NO descontaste disponible, hay que bajarlo ahora:
                            if (!RESERVA_DESCUENTA_DISPONIBLE_AL_RESERVAR) {
                                BigDecimal disp = (exLock.getCantidadDisponible() == null) ? BigDecimal.ZERO : exLock.getCantidadDisponible();
                                if (disp.compareTo(lc.getCantidad()) < 0) {
                                    throw new IllegalArgumentException(
                                            "Stock disponible insuficiente al consumir reserva en lote " + lc.getIdLote()
                                                    + " (disponible: " + disp + ", requerido: " + lc.getCantidad() + ")");
                                }
                                exLock.setCantidadDisponible(disp.subtract(lc.getCantidad()));
                            }

                            exLock.setFechaUltimaActualizacion(LocalDateTime.now());
                            existenciaRepo.save(exLock);

                            var detLote = VentaDetalleLote.builder()
                                    .idVentaDetalle(det.getIdVentaDetalle())
                                    .idLote(lc.getIdLote())
                                    .cantidad(lc.getCantidad())
                                    .build();
                            ventaDetLoteRepo.save(detLote);

                            var mov = MovimientoInventario.builder()
                                    .fechaMovimiento(LocalDateTime.now())
                                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.salida_venta)
                                    .idAlmacenOrigen(it.getIdAlmacenOrigen())
                                    .idLote(lc.getIdLote())
                                    .cantidad(lc.getCantidad())
                                    .referenciaModulo("venta")
                                    .idReferencia(det.getIdVentaDetalle())
                                    .observaciones("Salida por venta #" + venta.getIdVenta() + " (consumo de reserva)")
                                    .build();
                            movRepo.save(mov);

                            BigDecimal brutoParte = lc.getCantidad().multiply(precioUnit);
                            BigDecimal descPartePct = brutoParte.multiply(descPct).divide(new BigDecimal("100"));
                            BigDecimal descParte = descPartePct.add(descMonto.min(brutoParte));
                            BigDecimal netoParte = brutoParte.subtract(descParte);

                            det.setSubtotalBob(det.getSubtotalBob().add(netoParte));

                            asignaciones.add(VentaRespuestaDTO.ItemAsignado.builder()
                                    .idPresentacion(it.getIdPresentacion())
                                    .sku(present.getCodigoSku())
                                    .producto(null)
                                    .numeroLote("L" + lc.getIdLote())
                                    .vencimiento(null)
                                    .cantidad(lc.getCantidad())
                                    .precioUnitarioBob(precioUnit)
                                    .subtotalBob(netoParte)
                                    .build());
                        }

                    } else {
                        // ======= Camino 2: sin lotes => FEFO sobre cantidadDisponible =======
                        BigDecimal porDespachar = it.getCantidad();
                        var existencias = existenciaRepo.pickFefo(dto.getIdAlmacenDespacho(), it.getIdPresentacion(), 500);

                        for (var ex : existencias) {
                            if (porDespachar.compareTo(BigDecimal.ZERO) <= 0) break;

                            var exLock = existenciaRepo.lockByAlmacenAndIdLote(ex.getIdAlmacen(), ex.getIdLote())
                                    .orElseThrow(() -> new IllegalStateException("Existencia desapareció durante la venta"));

                            if (exLock.getCantidadDisponible() == null
                                    || exLock.getCantidadDisponible().compareTo(BigDecimal.ZERO) <= 0) continue;

                            var mover = exLock.getCantidadDisponible().min(porDespachar);
                            if (mover.compareTo(BigDecimal.ZERO) <= 0) continue;

                            exLock.setCantidadDisponible(exLock.getCantidadDisponible().subtract(mover));
                            exLock.setFechaUltimaActualizacion(LocalDateTime.now());
                            existenciaRepo.save(exLock);

                            var detLote = VentaDetalleLote.builder()
                                    .idVentaDetalle(det.getIdVentaDetalle())
                                    .idLote(exLock.getIdLote())
                                    .cantidad(mover)
                                    .build();
                            ventaDetLoteRepo.save(detLote);

                            var mov = MovimientoInventario.builder()
                                    .fechaMovimiento(LocalDateTime.now())
                                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.salida_venta)
                                    .idAlmacenOrigen(dto.getIdAlmacenDespacho())
                                    .idLote(exLock.getIdLote())
                                    .cantidad(mover)
                                    .referenciaModulo("venta")
                                    .idReferencia(det.getIdVentaDetalle())
                                    .observaciones("Salida por venta #" + venta.getIdVenta())
                                    .build();
                            movRepo.save(mov);

                            BigDecimal brutoParte = mover.multiply(precioUnit);
                            BigDecimal descPartePct = brutoParte.multiply(descPct).divide(new BigDecimal("100"));
                            BigDecimal descParte = descPartePct.add(descMonto.min(brutoParte));
                            BigDecimal netoParte = brutoParte.subtract(descParte);

                            det.setSubtotalBob(det.getSubtotalBob().add(netoParte));

                            asignaciones.add(VentaRespuestaDTO.ItemAsignado.builder()
                                    .idPresentacion(it.getIdPresentacion())
                                    .sku(present.getCodigoSku())
                                    .producto(null)
                                    .numeroLote("L" + exLock.getIdLote())
                                    .vencimiento(null)
                                    .cantidad(mover)
                                    .precioUnitarioBob(precioUnit)
                                    .subtotalBob(netoParte)
                                    .build());

                            porDespachar = porDespachar.subtract(mover);
                        }

                        if (porDespachar.compareTo(BigDecimal.ZERO) > 0) {
                            throw new IllegalArgumentException("Stock insuficiente para la presentación " + it.getIdPresentacion()
                                    + " en almacén " + dto.getIdAlmacenDespacho() + ". Falta: " + porDespachar);
                        }
                    }

                    ventaDetRepo.save(det);

                    totalBruto = totalBruto.add(it.getCantidad().multiply(precioUnit));
                    BigDecimal descDet = it.getCantidad().multiply(precioUnit).multiply(descPct).divide(new BigDecimal("100"))
                            .add(descMonto);
                    totalDesc = totalDesc.add(descDet);
                }

                BigDecimal totalNeto = totalBruto.subtract(totalDesc);
                if (totalNeto.compareTo(BigDecimal.ZERO) < 0) totalNeto = BigDecimal.ZERO;

                // ===== IMPUESTO si FACTURA =====
                BigDecimal impuestoPct = BigDecimal.ZERO;
                BigDecimal impuestoMonto = BigDecimal.ZERO;

                if (venta.getTipoDocumentoTributario() == Venta.TipoDocumentoTributario.factura) {
                    impuestoPct = resolverImpuestoPct(dto.getImpuestoId());
                    if (impuestoPct.signum() > 0) {
                        impuestoMonto = totalNeto.multiply(impuestoPct).divide(new BigDecimal("100"));
                        totalNeto = totalNeto.add(impuestoMonto);
                    }
                }

                // ===== Guardar totales =====
                venta.setTotalBrutoBob(totalBruto);
                venta.setDescuentoTotalBob(totalDesc);
                venta.setTotalNetoBob(totalNeto);
                ventaRepo.save(venta);

                // ===== CxC si CRÉDITO: interés % fijo aplicado 1 sola vez =====
                if (venta.getCondicionDePago() == Venta.CondicionPago.credito) {
                    BigDecimal factorInteres = BigDecimal.ONE.add(
                            interesCreditoPct.divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP)
                    );
                    BigDecimal montoPendiente = totalNeto.multiply(factorInteres).setScale(2, RoundingMode.HALF_UP);

                    var cxc = CuentaPorCobrar.builder()
                            .idVenta(venta.getIdVenta())
                            .montoPendienteBob(montoPendiente)
                            .fechaEmision(LocalDate.now())
                            .fechaVencimiento(dto.getFechaVencimientoCredito())
                            .estadoCuenta(EstadoCuenta.pendiente)
                            .build();
                    cxcRepo.save(cxc);
                }

                return VentaRespuestaDTO.builder()
                        .idVenta(venta.getIdVenta())
                        .totalBrutoBob(totalBruto)
                        .descuentoTotalBob(totalDesc)
                        .totalNetoBob(totalNeto)
                        .impuestoPorcentaje(impuestoPct)
                        .impuestoMontoBob(impuestoMonto)
                        .interesCredito(interesCreditoPct)
                        .asignaciones(asignaciones)
                        .build();

            } catch (DataIntegrityViolationException ex) {
                if (retries < 0) throw ex;
            }
        }

        throw new IllegalStateException("No se pudo generar número de documento para la venta");
    }

    @Transactional
    public void anular(Long idVenta, String motivo) {
        var venta = ventaRepo.findById(idVenta)
                .orElseThrow(() -> new IllegalArgumentException("Venta no encontrada: " + idVenta));

        if (venta.getEstadoVenta() == Venta.EstadoVenta.anulada) {
            throw new IllegalArgumentException("La venta ya está anulada");
        }

        var detalles = ventaDetRepo.findByIdVentaOrderByIdVentaDetalleAsc(idVenta);
        if (detalles.isEmpty()) {
            throw new IllegalStateException("La venta no tiene detalles");
        }

        for (var det : detalles) {
            var lotes = ventaDetLoteRepo.findByIdVentaDetalle(det.getIdVentaDetalle());
            for (var dl : lotes) {
                var exLock = existenciaRepo
                        .lockByAlmacenAndIdLote(venta.getIdAlmacenDespacho(), dl.getIdLote())
                        .orElseThrow(() -> new IllegalStateException(
                                "No existe existencia para almacén " + venta.getIdAlmacenDespacho() +
                                        " y lote " + dl.getIdLote())
                        );

                exLock.setCantidadDisponible(exLock.getCantidadDisponible().add(dl.getCantidad()));
                exLock.setFechaUltimaActualizacion(LocalDateTime.now());
                existenciaRepo.save(exLock);

                var mov = MovimientoInventario.builder()
                        .fechaMovimiento(LocalDateTime.now())
                        .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                        .idAlmacenDestino(venta.getIdAlmacenDespacho())
                        .idLote(dl.getIdLote())
                        .cantidad(dl.getCantidad())
                        .referenciaModulo("venta")
                        .idReferencia(det.getIdVentaDetalle())
                        .observaciones("Anulación de venta #" + idVenta + (motivo != null ? (" — " + motivo) : ""))
                        .build();
                movRepo.save(mov);
            }
        }

        cxcRepo.findByIdVenta(idVenta).ifPresent(cxc -> {
            long apps = aplPagoRepo.countByIdCuentaCobrar(cxc.getIdCuentaCobrar());
            if (apps > 0) {
                throw new IllegalArgumentException("No se puede anular: la CxC tiene pagos aplicados");
            }
            cxcRepo.deleteById(cxc.getIdCuentaCobrar());
        });

        venta.setEstadoVenta(Venta.EstadoVenta.anulada);
        ventaRepo.save(venta);
    }
}
