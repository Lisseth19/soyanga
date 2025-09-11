package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dominio.Venta;
import com.soyanga.soyangabackend.dto.ventas.VentaTrazabilidadDTO;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaDetalleLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class VentaTrazabilidadServicio {

    private final VentaRepositorio ventaRepo;
    private final VentaDetalleRepositorio vdRepo;
    private final VentaDetalleLoteRepositorio vdlRepo;
    private final MovimientoInventarioRepositorio movRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;

    @Transactional(readOnly = true)
    public VentaTrazabilidadDTO obtener(Long idVenta) {
        var v = ventaRepo.findById(idVenta)
                .orElseThrow(() -> new IllegalArgumentException("Venta no encontrada: " + idVenta));

        // Cabecera base
        var dto = VentaTrazabilidadDTO.builder()
                .idVenta(v.getIdVenta())
                .fechaVenta(v.getFechaVenta())
                .idCliente(v.getIdCliente())
                .cliente(null) // Si quieres, resuelve el nombre con un join/proyección aparte
                .idMoneda(v.getIdMoneda())
                .totalBrutoBob(v.getTotalBrutoBob())
                .descuentoTotalBob(v.getDescuentoTotalBob())
                .totalNetoBob(v.getTotalNetoBob())
                .condicionDePago(v.getCondicionDePago().name())
                .fechaVencimientoCredito(v.getFechaVencimientoCredito())
                .idAlmacenDespacho(v.getIdAlmacenDespacho())
                .estadoVenta(v.getEstadoVenta().name())
                .build();

        // CxC (si existe)
        cxcRepo.findByIdVenta(idVenta).ifPresent(cxc -> {
            dto.setIdCuentaCobrar(cxc.getIdCuentaCobrar());
            dto.setCxcPendienteBob(cxc.getMontoPendienteBob());
            dto.setCxcVencimiento(cxc.getFechaVencimiento());
            dto.setEstadoCxc(cxc.getEstadoCuenta().name());
        });

        // Detalles con presentaciones
        var detalleViews = vdRepo.detalleConPresentacion(idVenta);
        Map<Long, VentaTrazabilidadDTO.DetalleDTO> mapDet = new LinkedHashMap<>();
        for (var d : detalleViews) {
            var detDto = VentaTrazabilidadDTO.DetalleDTO.builder()
                    .idVentaDetalle(d.getIdVentaDetalle())
                    .idPresentacion(d.getIdPresentacion())
                    .sku(d.getSku())
                    .producto(d.getProducto())
                    .cantidad(d.getCantidad())
                    .precioUnitarioBob(d.getPrecioUnitarioBob())
                    .lotes(new ArrayList<>())
                    .build();
            mapDet.put(d.getIdVentaDetalle(), detDto);
        }

        // Lotes consumidos
        var lotes = vdlRepo.consumosPorVenta(idVenta);
        for (var l : lotes) {
            var det = mapDet.get(l.getIdVentaDetalle());
            if (det != null) {
                det.getLotes().add(
                        VentaTrazabilidadDTO.LoteDTO.builder()
                                .idLote(l.getIdLote())
                                .numeroLote(l.getNumeroLote())
                                .cantidad(l.getCantidad())
                                .build()
                );
            }
        }

        dto.setDetalles(new ArrayList<>(mapDet.values()));

        // Movimientos (kárdex) por venta
        var movs = movRepo.porVenta(idVenta);
        dto.setMovimientos(
                movs.stream().map(m ->
                        VentaTrazabilidadDTO.MovimientoDTO.builder()
                                .idMovimiento(m.getIdMovimiento())
                                .fechaMovimiento(m.getFechaMovimiento())
                                .tipoMovimiento(m.getTipoMovimiento().name())
                                .idLote(m.getIdLote())
                                .cantidad(m.getCantidad())
                                .idAlmacenOrigen(m.getIdAlmacenOrigen())
                                .idAlmacenDestino(m.getIdAlmacenDestino())
                                .build()
                ).toList()
        );

        return dto;
    }
}
