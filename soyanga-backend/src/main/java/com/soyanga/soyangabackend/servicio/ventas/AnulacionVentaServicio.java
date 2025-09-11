package com.soyanga.soyangabackend.servicio.ventas;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.ventas.LoteCantidadProjection;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaDetalleLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnulacionVentaServicio {

    private final VentaRepositorio ventaRepo;
    private final VentaDetalleLoteRepositorio vdlRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;
    private final AplicacionPagoRepositorio aplPagoRepo;

    @Transactional
    public Map<String, Object> anularVenta(Long idVenta, String motivo) {
        // 1) Venta
        var venta = ventaRepo.findById(idVenta)
                .orElseThrow(() -> new IllegalArgumentException("Venta no encontrada: " + idVenta));

        // estadoVenta es un enum -> comparar con el enum
        if (venta.getEstadoVenta() == Venta.EstadoVenta.anulada) {
            throw new IllegalArgumentException("La venta ya está anulada");
        }

        // 2) Si fue crédito y tiene pagos aplicados -> no permitir
        cxcRepo.findByIdVenta(idVenta).ifPresent(cxc -> {
            long apps = aplPagoRepo.countByIdCuentaCobrar(cxc.getIdCuentaCobrar());
            if (apps > 0) {
                throw new IllegalArgumentException("La venta tiene pagos aplicados; no se puede anular");
            }
        });

        // 3) Revertir stock por lote (venta.idAlmacenDespacho)
        var lotes = vdlRepo.lotesDeVenta(idVenta);
        if (lotes.isEmpty()) {
            throw new IllegalStateException("La venta no tiene detalle por lotes; no se puede revertir el stock");
        }

        Long almacen = venta.getIdAlmacenDespacho();
        var detalleReversa = new HashMap<Long, BigDecimal>(); // idLote -> cantidad repuesta

        for (LoteCantidadProjection lc : lotes) {
            Long idLote = lc.getIdLote();
            BigDecimal cant = lc.getCantidad();

            var ex = existenciaRepo.lockByAlmacenAndIdLote(almacen, idLote)
                    .orElseGet(() -> ExistenciaPorLote.builder()
                            .idAlmacen(almacen)
                            .idLote(idLote)
                            .cantidadDisponible(BigDecimal.ZERO)
                            .cantidadReservada(BigDecimal.ZERO)
                            .stockMinimo(BigDecimal.ZERO)
                            .build());

            ex.setCantidadDisponible(ex.getCantidadDisponible().add(cant));
            existenciaRepo.save(ex);

            var mov = MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                    .idAlmacenOrigen(null)
                    .idAlmacenDestino(almacen)
                    .idLote(idLote)
                    .cantidad(cant) // positivo = ingresa
                    .referenciaModulo("venta")
                    .idReferencia(idVenta)
                    .observaciones("Anulación de venta " + idVenta + (motivo != null ? " — " + motivo : ""))
                    .build();
            movRepo.save(mov);

            detalleReversa.merge(idLote, cant, BigDecimal::add);
        }

        // 4) Marcar venta como anulada (enum)
        venta.setEstadoVenta(Venta.EstadoVenta.anulada);
        ventaRepo.save(venta);

        // 5) Si existía CxC (crédito) y NO tiene aplicaciones, eliminarla
        cxcRepo.findByIdVenta(idVenta).ifPresent(cxcRepo::delete);

        // 6) Respuesta
        Map<String, Object> resp = new HashMap<>();
        resp.put("ventaId", idVenta);
        resp.put("estadoNuevo", venta.getEstadoVenta().name());
        resp.put("lotesRevertidos", detalleReversa);
        return resp;
    }
}
