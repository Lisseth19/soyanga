package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dto.inventario.TransferenciaListadoProjection;
import com.soyanga.soyangabackend.repositorio.inventario.TransferenciaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TransferenciaConsultaServicio {

    private final TransferenciaRepositorio transferenciaRepo;
    private final com.soyanga.soyangabackend.repositorio.inventario.TransferenciaDetalleRepositorio detRepo;
    private final com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio movRepo;


    public Page<TransferenciaListadoProjection> listar(
            String estado,
            Long origenId,
            Long destinoId,
            String desde,   // formato: YYYY-MM-DD (opcional)
            String hasta,   // formato: YYYY-MM-DD (opcional)
            Pageable pageable
    ) {
        LocalDateTime dDesde = null;
        LocalDateTime dHasta = null;

        try {
            if (desde != null && !desde.isBlank()) {
                dDesde = LocalDate.parse(desde).atStartOfDay();
            }
            if (hasta != null && !hasta.isBlank()) {
                // fin del día
                dHasta = LocalDate.parse(hasta).atTime(23, 59, 59);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Formato de fecha inválido. Usa YYYY-MM-DD en 'desde' y 'hasta'.");
        }

        String estadoFiltrado = (estado != null && !estado.isBlank()) ? estado : null;
        return transferenciaRepo.listar(estadoFiltrado, origenId, destinoId, dDesde, dHasta, pageable);
    }

    public com.soyanga.soyangabackend.dto.inventario.TransferenciaDetalleDTO detalle(Long id) {
        var cab = transferenciaRepo.cabecera(id)
                .orElseThrow(() -> new IllegalArgumentException("Transferencia no encontrada: " + id));

        var items = detRepo.itemsPorTransferencia(id).stream()
                .map(it -> com.soyanga.soyangabackend.dto.inventario.TransferenciaDetalleDTO.Item.builder()
                        .idLote(it.getIdLote())
                        .numeroLote(it.getNumeroLote())
                        .idPresentacion(it.getIdPresentacion())
                        .sku(it.getSku())
                        .producto(it.getProducto())
                        .cantidad(it.getCantidad())
                        .build()
                ).toList();

        var movs = movRepo.movimientosPorTransferencia(id).stream()
                .map(m -> com.soyanga.soyangabackend.dto.inventario.TransferenciaDetalleDTO.Movimiento.builder()
                        .idMovimiento(m.getIdMovimiento())
                        .fechaMovimiento(m.getFechaMovimiento())
                        .tipoMovimiento(m.getTipoMovimiento())
                        .idLote(m.getIdLote())
                        .cantidad(m.getCantidad())
                        .idAlmacenOrigen(m.getIdAlmacenOrigen())
                        .idAlmacenDestino(m.getIdAlmacenDestino())
                        .build()
                ).toList();

        return com.soyanga.soyangabackend.dto.inventario.TransferenciaDetalleDTO.builder()
                .idTransferencia(cab.getIdTransferencia())
                .fecha(cab.getFecha())
                .estado(cab.getEstado())
                .idAlmacenOrigen(cab.getIdAlmacenOrigen())
                .idAlmacenDestino(cab.getIdAlmacenDestino())
                .almacenOrigen(cab.getAlmacenOrigen())
                .almacenDestino(cab.getAlmacenDestino())
                .observaciones(cab.getObservaciones())
                .items(items)
                .movimientos(movs)
                .build();
    }

}
