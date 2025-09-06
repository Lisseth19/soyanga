package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.ventas.VentaCrearDTO;
import com.soyanga.soyangabackend.dto.ventas.VentaRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.soyanga.soyangabackend.dominio.CuentaPorCobrar.EstadoCuenta;

import java.math.BigDecimal;
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

    private final PresentacionProductoRepositorio presentacionRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;

    @Transactional
    public VentaRespuestaDTO crear(VentaCrearDTO dto) {
        if ("credito".equalsIgnoreCase(dto.getCondicionDePago()) &&
                dto.getFechaVencimientoCredito() == null) {
            throw new IllegalArgumentException("Para ventas a crédito, fechaVencimientoCredito es obligatoria");
        }

        var fecha = dto.getFechaVenta() != null ? dto.getFechaVenta() : LocalDateTime.now();

        // convierte strings del DTO → enums de la entidad
        var tipoDoc = parseEnumLower(Venta.TipoDocumentoTributario.class,
                dto.getTipoDocumentoTributario(),
                "tipoDocumentoTributario");

        // metodoDePago: si viene null, usa efectivo como default
        var metodo = dto.getMetodoDePago() != null
                ? parseEnumLower(Venta.MetodoDePago.class, dto.getMetodoDePago(), "metodoDePago")
                : Venta.MetodoDePago.efectivo;

        var condicion = parseEnumLower(Venta.CondicionPago.class,
                dto.getCondicionDePago(),
                "condicionDePago");

        var estado = Venta.EstadoVenta.confirmada;

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
                .fechaVencimientoCredito(dto.getFechaVencimientoCredito())
                .idAlmacenDespacho(dto.getIdAlmacenDespacho())
                .estadoVenta(estado)
                .observaciones(dto.getObservaciones())
                .build();
        venta = ventaRepo.save(venta);

        var asignaciones = new ArrayList<VentaRespuestaDTO.ItemAsignado>();
        BigDecimal totalBruto = BigDecimal.ZERO;
        BigDecimal totalDesc = BigDecimal.ZERO;

        // 2) Recorrer items
        for (var it : dto.getItems()) {
            var present = presentacionRepo.findById(it.getIdPresentacion())
                    .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada: " + it.getIdPresentacion()));

            BigDecimal precioUnit = it.getPrecioUnitarioBob() != null ? it.getPrecioUnitarioBob() : present.getPrecioVentaBob();
            if (precioUnit == null) precioUnit = BigDecimal.ZERO;

            BigDecimal descPct = it.getDescuentoPorcentaje() != null ? it.getDescuentoPorcentaje() : BigDecimal.ZERO;
            BigDecimal descMonto = it.getDescuentoMontoBob() != null ? it.getDescuentoMontoBob() : BigDecimal.ZERO;

            // 2.1 Detalle base (sin lotes todavía)
            var det = VentaDetalle.builder()
                    .idVenta(venta.getIdVenta())
                    .idPresentacion(it.getIdPresentacion())
                    .cantidad(it.getCantidad())
                    .precioUnitarioBob(precioUnit)
                    .descuentoPorcentaje(descPct)
                    .descuentoMontoBob(descMonto)
                    .subtotalBob(BigDecimal.ZERO) // lo calculamos después de asignar lotes
                    .build();
            det = ventaDetRepo.save(det);

            // 2.2 Asignación FEFO por existencias
            BigDecimal porDespachar = it.getCantidad();

            // lista FEFO (limite alto por seguridad)
            var existencias = existenciaRepo.pickFefo(dto.getIdAlmacenDespacho(), it.getIdPresentacion(), 500);

            for (var ex : existencias) {
                if (porDespachar.compareTo(BigDecimal.ZERO) <= 0) break;

                // bloquea la fila para actualización segura
                var exLock = existenciaRepo.lockByAlmacenAndIdLote(ex.getIdAlmacen(), ex.getIdLote())
                        .orElseThrow(() -> new IllegalStateException("Existencia desapareció durante la venta"));

                if (exLock.getCantidadDisponible().compareTo(BigDecimal.ZERO) <= 0) continue;

                var mover = exLock.getCantidadDisponible().min(porDespachar);
                if (mover.compareTo(BigDecimal.ZERO) <= 0) continue;

                // resta stock
                exLock.setCantidadDisponible(exLock.getCantidadDisponible().subtract(mover));
                exLock.setFechaUltimaActualizacion(LocalDateTime.now());
                existenciaRepo.save(exLock);

                // registrar detalle por lote
                var detLote = VentaDetalleLote.builder()
                        .idVentaDetalle(det.getIdVentaDetalle())
                        .idLote(exLock.getIdLote())
                        .cantidad(mover)
                        .build();
                ventaDetLoteRepo.save(detLote);

                // movimiento de salida
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

                // subtotal por esta porción
                BigDecimal brutoParte = mover.multiply(precioUnit);
                BigDecimal descPartePct = brutoParte.multiply(descPct).divide(new BigDecimal("100"));
                BigDecimal descParte = descPartePct.add(descMonto.min(brutoParte)); // aplica fijo topeado
                BigDecimal netoParte = brutoParte.subtract(descParte);

                det.setSubtotalBob(det.getSubtotalBob().add(netoParte));

                // para respuesta (opcional)
                asignaciones.add(VentaRespuestaDTO.ItemAsignado.builder()
                        .idPresentacion(it.getIdPresentacion())
                        .sku(present.getCodigoSku())
                        .producto(null) // si quieres, puedes traer nombre desde una proyección
                        .numeroLote("L" + exLock.getIdLote())
                        .vencimiento(null) // si necesitas, puedes selectear desde lotes
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
            // aproximación: sumamos descuentos del detalle (podrías recalcular exacto con asientos por porción)
            BigDecimal descDet = it.getCantidad().multiply(precioUnit).multiply(descPct).divide(new BigDecimal("100"))
                    .add(descMonto);
            totalDesc = totalDesc.add(descDet);
        }

        BigDecimal totalNeto = totalBruto.subtract(totalDesc);
        if (totalNeto.compareTo(BigDecimal.ZERO) < 0) totalNeto = BigDecimal.ZERO;

        venta.setTotalBrutoBob(totalBruto);
        venta.setDescuentoTotalBob(totalDesc);
        venta.setTotalNetoBob(totalNeto);
        ventaRepo.save(venta);

        // 3) Si es crédito, generar CxC
        if ("credito".equalsIgnoreCase(dto.getCondicionDePago())) {
            var cxc = CuentaPorCobrar.builder()
                    .idVenta(venta.getIdVenta())
                    .montoPendienteBob(totalNeto)
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
                .asignaciones(asignaciones)
                .build();
    }
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

}
