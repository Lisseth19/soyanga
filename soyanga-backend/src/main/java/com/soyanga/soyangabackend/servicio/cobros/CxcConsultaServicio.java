// src/main/java/com/soyanga/soyangabackend/servicio/cobros/CxcConsultaServicio.java
package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.CuentaPorCobrar;
import com.soyanga.soyangabackend.dto.cobros.CxcDetalleDTO;
import com.soyanga.soyangabackend.dto.cobros.CxcPagoLineaProjection;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class CxcConsultaServicio {

    private final CuentaPorCobrarRepositorio cxcRepo;
    private final AplicacionPagoRepositorio aplRepo;

    @Transactional(readOnly = true)
    public CxcDetalleDTO detalleCxc(Long idCxc) {
        CuentaPorCobrar cxc = cxcRepo.findById(idCxc)
                .orElseThrow(() -> new IllegalArgumentException("CXC no encontrada: " + idCxc));

        // historial de aplicaciones
        var lineas = aplRepo.historialCxc(idCxc);

        BigDecimal totalAplicado = lineas.stream()
                .map(CxcPagoLineaProjection::getMontoAplicadoBob)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // total a cobrar = lo aplicado + lo que aún queda pendiente (lo que “tuvo” la CxC)
        BigDecimal totalACobrar = cxc.getMontoPendienteBob().add(totalAplicado);

        // construir líneas con “saldo después”
        var pagosDTO = new ArrayList<CxcDetalleDTO.PagoLinea>();
        BigDecimal saldo = totalACobrar;
        for (var it : lineas) {
            saldo = saldo.subtract(it.getMontoAplicadoBob());
            pagosDTO.add(CxcDetalleDTO.PagoLinea.builder()
                    .idPago(it.getIdPagoRecibido())
                    .fechaPago(it.getFechaPago())
                    .metodoDePago(it.getMetodoDePago())
                    .referenciaExterna(it.getReferenciaExterna())
                    .montoPagoBob(it.getMontoPagoBob())
                    .aplicadoBob(it.getMontoAplicadoBob())
                    .saldoDespues(saldo.max(BigDecimal.ZERO))
                    .build());
        }

        // info de cliente (opcional) desde la venta
        var ventaInfo = cxcRepo.findVentaInfoByIdCxc(idCxc).orElse(null);
        Long idCliente = ventaInfo != null ? ventaInfo.getIdCliente() : null;

        return CxcDetalleDTO.builder()
                .idCuentaCobrar(cxc.getIdCuentaCobrar())
                .idVenta(cxc.getIdVenta())
                .idCliente(idCliente)
                .cliente(null) // si quieres, agrégalo en la query o arma otro join
                .totalACobrar(totalACobrar)
                .totalAplicado(totalAplicado)
                .pendiente(cxc.getMontoPendienteBob())
                .fechaEmision(cxc.getFechaEmision())
                .fechaVencimiento(cxc.getFechaVencimiento())
                .estadoCuenta(cxc.getEstadoCuenta().name())
                .pagos(pagosDTO)
                .build();
    }
}
