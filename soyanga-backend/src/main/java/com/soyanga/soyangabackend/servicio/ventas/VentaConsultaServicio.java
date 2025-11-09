package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dto.ventas.VentaDetalleRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionAnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

        // ===== Items
        var items = vdRepo.itemsDeVenta(idVenta);
        var ids = items.stream().map(VentaDetalleRepositorio.VentaItemProjection::getIdVentaDetalle).toList();

        Map<Long, List<VentaDetalleRespuestaDTO.Lote>> lotesPorItem = new HashMap<>();
        if (!ids.isEmpty()) {
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

        // ===== Interés (mostrar siempre para crédito; persiste aunque haya pagos)
        BigDecimal interesPct = header.getInteresCredito() != null ? header.getInteresCredito() : BigDecimal.ZERO;
        BigDecimal totalNeto = header.getTotalNetoBob() != null ? header.getTotalNetoBob() : BigDecimal.ZERO;
        BigDecimal interesMonto = BigDecimal.ZERO;
        BigDecimal totalCobrar = totalNeto;

        if (interesPct.signum() > 0) {
            interesMonto = totalNeto.multiply(interesPct)
                    .divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP)
                    .setScale(2, RoundingMode.HALF_UP);
            totalCobrar = totalNeto.add(interesMonto).setScale(2, RoundingMode.HALF_UP);
        }

        // ===== CxC (si aplica)
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

        // ===== Respuesta
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
                .totalNetoBob(totalNeto)
                .metodoDePago(header.getMetodoDePago())
                .condicionDePago(header.getCondicionDePago())
                .fechaVencimientoCredito(header.getFechaVencimientoCredito())
                .idAlmacenDespacho(header.getIdAlmacenDespacho())
                .observaciones(header.getObservaciones())
                .interesCreditoPct(interesPct)
                .interesCreditoMonto(interesMonto)
                .totalCobrarBob(totalCobrar)
                .cxc(cxcInfo)
                .items(itemsDTO)
                .build();
    }
}
