package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dto.ventas.VentaDetalleRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionAnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VentaConsultaServicio {

    private final VentaRepositorio ventaRepo;
    private final VentaDetalleRepositorio vdRepo;
    private final VentaDetalleLoteRepositorio vdlRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;
    private final AplicacionPagoRepositorio aplPagoRepo;
    private final AplicacionAnticipoRepositorio aplAntRepo;

    public Page<VentaRepositorio.VentaListadoProjection> listar(
            String estado, Long clienteId, LocalDateTime desde, LocalDateTime hasta, Pageable pageable) {
        String est = (estado == null || estado.isBlank()) ? null : estado.trim();
        return ventaRepo.listar(est, clienteId, desde, hasta, pageable);
    }

    public VentaDetalleRespuestaDTO detalle(Long idVenta) {
        var header = ventaRepo.header(idVenta);
        if (header == null) throw new IllegalArgumentException("Venta no encontrada: " + idVenta);

        // Items
        var items = vdRepo.itemsDeVenta(idVenta);
        var ids = items.stream().map(VentaDetalleRepositorio.VentaItemProjection::getIdVentaDetalle).toList();

        Map<Long, List<VentaDetalleRespuestaDTO.Lote>> lotesPorItem = new HashMap<>();
        if (!ids.isEmpty()) {
            // Asegúrate de tener este método en tu repo (abajo te dejo el SQL sugerido)
            var lotes = vdlRepo.lotesDeItems(ids);
            for (var l : lotes) {
                lotesPorItem
                        .computeIfAbsent(l.getIdVentaDetalle(), k -> new ArrayList<>())
                        .add(VentaDetalleRespuestaDTO.Lote.builder()
                                .idLote(l.getIdLote())
                                .numeroLote(l.getNumeroLote())
                                .cantidad(l.getCantidad())
                                .build());
            }
        }

        var itemsDTO = items.stream().map(it -> VentaDetalleRespuestaDTO.Item.builder()
                .idVentaDetalle(it.getIdVentaDetalle())
                .idPresentacion(it.getIdPresentacion())
                .sku(it.getSku())
                .producto(it.getProducto())
                .cantidad(it.getCantidad())
                .precioUnitarioBob(it.getPrecioUnitarioBob())
                .descuentoPorcentaje(it.getDescuentoPorcentaje())
                .descuentoMontoBob(it.getDescuentoMontoBob())
                .subtotalBob(it.getSubtotalBob())
                .lotes(lotesPorItem.getOrDefault(it.getIdVentaDetalle(), List.of()))
                .build()
        ).toList();

        // CxC (si aplica)
        VentaDetalleRespuestaDTO.CxcInfo cxcInfo = null;
        var cxcOpt = cxcRepo.findByIdVenta(idVenta);
        if (cxcOpt.isPresent()) {
            var cxc = cxcOpt.get();
            var totalPagos = aplPagoRepo.totalAplicadoPorCxc(cxc.getIdCuentaCobrar());
            var totalAnticipos = aplAntRepo.totalAplicadoPorVenta(idVenta);

            cxcInfo = VentaDetalleRespuestaDTO.CxcInfo.builder()
                    .idCuentaCobrar(cxc.getIdCuentaCobrar())
                    .estadoCuenta(cxc.getEstadoCuenta().name())
                    .montoPendienteBob(cxc.getMontoPendienteBob())
                    .fechaEmision(cxc.getFechaEmision())
                    .fechaVencimiento(cxc.getFechaVencimiento())
                    .totalPagosAplicadosBob(totalPagos)
                    .totalAnticiposAplicadosBob(totalAnticipos)
                    .build();
        }

        return VentaDetalleRespuestaDTO.builder()
                .idVenta(header.getIdVenta())
                .fechaVenta(header.getFechaVenta())
                .estadoVenta(header.getEstadoVenta())
                .tipoDocumentoTributario(header.getTipoDocumentoTributario())
                .numeroDocumento(header.getNumeroDocumento())
                .idCliente(header.getIdCliente())
                .cliente(header.getCliente())
                .idMoneda(header.getIdMoneda())
                .totalBrutoBob(header.getTotalBrutoBob())
                .descuentoTotalBob(header.getDescuentoTotalBob())
                .totalNetoBob(header.getTotalNetoBob())
                .metodoDePago(header.getMetodoDePago())
                .condicionDePago(header.getCondicionDePago())
                .fechaVencimientoCredito(header.getFechaVencimientoCredito())
                .idAlmacenDespacho(header.getIdAlmacenDespacho())
                .observaciones(header.getObservaciones())
                .cxc(cxcInfo)
                .items(itemsDTO)
                .build();
    }
}
