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
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.soyanga.soyangabackend.dominio.CuentaPorCobrar.EstadoCuenta;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;

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

    @Transactional
    public VentaRespuestaDTO crear(VentaCrearDTO dto) {

        // ===== Validaciones previas =====
        if ("credito".equalsIgnoreCase(dto.getCondicionDePago()) &&
                dto.getFechaVencimientoCredito() == null) {
            throw new IllegalArgumentException("Para ventas a crédito, fechaVencimientoCredito es obligatoria");
        }
        // Cliente obligatorio para FACTURA
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

        var venta = Venta.builder()
                .fechaVenta(fecha)
                .idCliente(dto.getIdCliente())
                .tipoDocumentoTributario(tipoDoc)
                .numeroDocumento(null)
                .idMoneda(1L)
                .totalBrutoBob(BigDecimal.ZERO)
                .descuentoTotalBob(BigDecimal.ZERO)
                .totalNetoBob(BigDecimal.ZERO)
                .metodoDePago(metodo)
                .condicionDePago(condicion)
                .interesCredito(interesCreditoPct) // se guarda el PORCENTAJE
                .fechaVencimientoCredito(dto.getFechaVencimientoCredito())
                .idAlmacenDespacho(dto.getIdAlmacenDespacho())
                .estadoVenta(estado)
                .observaciones(dto.getObservaciones())
                .build();
        venta = ventaRepo.save(venta);

        var asignaciones = new ArrayList<VentaRespuestaDTO.ItemAsignado>();
        BigDecimal totalBruto = BigDecimal.ZERO;
        BigDecimal totalDesc = BigDecimal.ZERO;

        // ===== Recorrer items =====
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

            BigDecimal porDespachar = it.getCantidad();
            var existencias = existenciaRepo.pickFefo(dto.getIdAlmacenDespacho(), it.getIdPresentacion(), 500);

            for (var ex : existencias) {
                if (porDespachar.compareTo(BigDecimal.ZERO) <= 0) break;

                var exLock = existenciaRepo.lockByAlmacenAndIdLote(ex.getIdAlmacen(), ex.getIdLote())
                        .orElseThrow(() -> new IllegalStateException("Existencia desapareció durante la venta"));

                if (exLock.getCantidadDisponible().compareTo(BigDecimal.ZERO) <= 0) continue;

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

        // ===== CxC si CRÉDITO: interés como PORCENTAJE =====
        if (venta.getCondicionDePago() == Venta.CondicionPago.credito) {
            // interesCreditoPct es el % (ej. 5 = 5%)
            BigDecimal factorInteres = BigDecimal.ONE.add(
                    interesCreditoPct.divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP)
            );
            BigDecimal montoPendiente = totalNeto.multiply(factorInteres).setScale(2, RoundingMode.HALF_UP);

            var cxc = CuentaPorCobrar.builder()
                    .idVenta(venta.getIdVenta())
                    .montoPendienteBob(montoPendiente)
                    .fechaEmision(LocalDate.now())
                    .fechaVencimiento(dto.getFechaVencimientoCredito()) // puede ser 1..N meses
                    .estadoCuenta(EstadoCuenta.pendiente)
                    .build();
            cxcRepo.save(cxc);
        }

        return VentaRespuestaDTO.builder()
                .idVenta(venta.getIdVenta())
                .totalBrutoBob(totalBruto)
                .descuentoTotalBob(totalDesc)
                .totalNetoBob(totalNeto)       // incluye impuesto si factura
                .impuestoPorcentaje(impuestoPct)
                .impuestoMontoBob(impuestoMonto)
                .interesCredito(interesCreditoPct) // porcentaje reportado en la respuesta
                .asignaciones(asignaciones)
                .build();
    }

    //------------------------------------------------------------------------------------------------------
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

    @Transactional
    public void anular(Long idVenta, String motivo) {
        var venta = ventaRepo.findById(idVenta)
                .orElseThrow(() -> new IllegalArgumentException("Venta no encontrada: " + idVenta));

        if ("anulada".equalsIgnoreCase(String.valueOf(venta.getEstadoVenta()))) {
            throw new IllegalArgumentException("La venta ya está anulada");
        }

        // Traer detalles y sus lotes
        var detalles = ventaDetRepo.findByIdVentaOrderByIdVentaDetalleAsc(idVenta);
        if (detalles.isEmpty()) {
            throw new IllegalStateException("La venta no tiene detalles");
        }

        // Reponer stock por cada lote usado en la venta
        for (var det : detalles) {
            var lotes = ventaDetLoteRepo.findByIdVentaDetalle(det.getIdVentaDetalle());
            for (var dl : lotes) {
                var exLock = existenciaRepo
                        .lockByAlmacenAndIdLote(venta.getIdAlmacenDespacho(), dl.getIdLote())
                        .orElseThrow(() -> new IllegalStateException(
                                "No existe existencia para almacén " + venta.getIdAlmacenDespacho() +
                                        " y lote " + dl.getIdLote())
                        );

                // Devolver disponible
                exLock.setCantidadDisponible(exLock.getCantidadDisponible().add(dl.getCantidad()));
                exLock.setFechaUltimaActualizacion(java.time.LocalDateTime.now());
                existenciaRepo.save(exLock);

                // Movimiento de inventario (ajuste de ingreso)
                var mov = MovimientoInventario.builder()
                        .fechaMovimiento(java.time.LocalDateTime.now())
                        .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                        .idAlmacenDestino(venta.getIdAlmacenDespacho()) // ingreso al almacén de despacho
                        .idLote(dl.getIdLote())
                        .cantidad(dl.getCantidad())
                        .referenciaModulo("venta")
                        .idReferencia(det.getIdVentaDetalle())
                        .observaciones("Anulación de venta #" + idVenta + (motivo != null ? (" — " + motivo) : ""))
                        .build();
                movRepo.save(mov);
            }
        }

        // Si hay CxC asociada y NO tiene pagos aplicados, elimínala.
        cxcRepo.findByIdVenta(idVenta).ifPresent(cxc -> {
            long apps = aplPagoRepo.countByIdCuentaCobrar(cxc.getIdCuentaCobrar());
            if (apps > 0) {
                throw new IllegalArgumentException("No se puede anular: la CxC tiene pagos aplicados");
            }
            // Eliminar la CxC asociada (venta permanece para historial, pero sin deuda)
            cxcRepo.deleteById(cxc.getIdCuentaCobrar());
        });

        // Marcar venta como anulada
        venta.setEstadoVenta(Venta.EstadoVenta.anulada);
        ventaRepo.save(venta);
    }

    // ===== Impuesto helper =====
    private BigDecimal resolverImpuestoPct(Long impuestoId) {
        // 1) si enviaron un id explícito
        if (impuestoId != null) {
            var imp = impuestoRepo.findById(impuestoId)
                    .orElseThrow(() -> new IllegalArgumentException("Impuesto no encontrado: " + impuestoId));
            if (Boolean.FALSE.equals(imp.getEstadoActivo())) {
                throw new IllegalArgumentException("El impuesto seleccionado no está activo");
            }
            return imp.getPorcentaje() != null ? imp.getPorcentaje() : BigDecimal.ZERO;
        }

        // 2) si NO enviaron id: toma 1 activo (el primero por nombre)
        var page = impuestoRepo.listar(null, true, PageRequest.of(0, 1)); // q=null, soloActivos=true
        if (page.isEmpty()) {
            throw new IllegalStateException("No hay impuestos activos configurados");
        }
        var p = page.getContent().get(0);
        return p.getPorcentaje() != null ? p.getPorcentaje() : BigDecimal.ZERO;
    }
}
