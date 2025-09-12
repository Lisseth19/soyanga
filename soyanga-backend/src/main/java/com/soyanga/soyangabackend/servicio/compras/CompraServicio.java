package com.soyanga.soyangabackend.servicio.compras;

import com.soyanga.soyangabackend.dominio.Compra;
import com.soyanga.soyangabackend.dominio.CompraDetalle;
import com.soyanga.soyangabackend.dto.compras.*;
import com.soyanga.soyangabackend.repositorio.compras.CompraDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.compras.CompraRepositorio;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CompraServicio {

    private final CompraRepositorio compraRepo;
    private final CompraDetalleRepositorio detalleRepo;

    public Page<CompraListadoProjection> listar(String estado, Long proveedorId,
                                                LocalDateTime desde, LocalDateTime hasta,
                                                Pageable pageable) {
        String estadoFiltrado = (estado == null || estado.isBlank()) ? null : estado.trim();
        return compraRepo.listar(estadoFiltrado, proveedorId, desde, hasta, pageable);
    }

    public CompraRespuestaDTO obtener(Long idCompra) {
        var c = compraRepo.findById(idCompra)
                .orElseThrow(() -> new IllegalArgumentException("Compra no encontrada: " + idCompra));

        var detalles = detalleRepo.findByIdCompra(idCompra).stream()
                .map(this::toDetalleDto)
                .toList();

        var totalItems = detalles.size();
        var totalMoneda = detalles.stream()
                .map(d -> d.getCantidad().multiply(d.getCostoUnitarioMoneda()))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        return CompraRespuestaDTO.builder()
                .idCompra(c.getIdCompra())
                .idProveedor(c.getIdProveedor())
                .fechaCompra(c.getFechaCompra())
                .idMoneda(c.getIdMoneda())
                .tipoCambioUsado(c.getTipoCambioUsado())
                .estado(c.getEstadoCompra().name())
                .observaciones(c.getObservaciones())
                .totalItems(totalItems)
                .totalMoneda(totalMoneda)
                .items(detalles)
                .build();
    }
    @Transactional
    public CompraRespuestaDTO crear(CompraCrearDTO dto) {
        var c = Compra.builder()
                .idProveedor(dto.getIdProveedor())
                .fechaCompra(dto.getFechaCompra() != null ? dto.getFechaCompra() : LocalDateTime.now())
                .idMoneda(dto.getIdMoneda())
                .tipoCambioUsado(dto.getTipoCambioUsado())
                .estadoCompra(Compra.EstadoCompra.pendiente)
                .observaciones(dto.getObservaciones())
                .build();
        c = compraRepo.save(c);
        return obtener(c.getIdCompra());
    }
    @Transactional
    public CompraDetalleRespuestaDTO agregarItem(Long idCompra, CompraDetalleCrearDTO dto) {
        var c = compraRepo.findById(idCompra)
                .orElseThrow(() -> new IllegalArgumentException("Compra no encontrada: " + idCompra));

        if (c.getEstadoCompra() == Compra.EstadoCompra.anulada
                || c.getEstadoCompra() == Compra.EstadoCompra.recibida) {
            throw new IllegalArgumentException("No se puede agregar ítems a una compra en estado " + c.getEstadoCompra());
        }

        var d = CompraDetalle.builder()
                .idCompra(c.getIdCompra())
                .idPresentacion(dto.getIdPresentacion())
                .cantidad(dto.getCantidad())
                .costoUnitarioMoneda(dto.getCostoUnitarioMoneda())
                .fechaEstimadaRecepcion(dto.getFechaEstimadaRecepcion())
                .build();
        d = detalleRepo.save(d);
        return toDetalleDto(d);
    }
    @Transactional
    public CompraRespuestaDTO cambiarEstado(Long idCompra, String nuevo) {
        var c = compraRepo.findById(idCompra)
                .orElseThrow(() -> new IllegalArgumentException("Compra no encontrada: " + idCompra));

        // Normalizamos el string a enum
        Compra.EstadoCompra estado;
        try {
            estado = Compra.EstadoCompra.valueOf(nuevo.trim().toLowerCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Estado inválido: " + nuevo);
        }

        c.setEstadoCompra(estado);
        compraRepo.save(c);
        return obtener(idCompra);
    }

    private CompraDetalleRespuestaDTO toDetalleDto(CompraDetalle d) {
        return CompraDetalleRespuestaDTO.builder()
                .idCompraDetalle(d.getIdCompraDetalle())
                .idPresentacion(d.getIdPresentacion())
                .cantidad(d.getCantidad())
                .costoUnitarioMoneda(d.getCostoUnitarioMoneda())
                .fechaEstimadaRecepcion(d.getFechaEstimadaRecepcion())
                .build();
    }
}
