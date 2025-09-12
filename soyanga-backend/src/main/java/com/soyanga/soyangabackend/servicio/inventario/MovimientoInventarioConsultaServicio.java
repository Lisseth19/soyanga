package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dto.inventario.MovimientoInventarioResponse;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MovimientoInventarioConsultaServicio {

    private final MovimientoInventarioRepositorio repo;

    public List<MovimientoInventarioResponse> ultimos(Long loteId, Long almacenId, int limit) {
        int lim = (limit <= 0 || limit > 200) ? 50 : limit;
        return repo.ultimos(loteId, almacenId, lim).stream()
                .map(r -> MovimientoInventarioResponse.builder()
                        .idMovimiento(r.getIdMovimiento())
                        .fechaMovimiento(r.getFechaMovimiento())
                        .tipoMovimiento(r.getTipoMovimiento())
                        .idLote(r.getIdLote())
                        .cantidad(r.getCantidad())
                        .idAlmacenOrigen(r.getIdAlmacenOrigen())
                        .idAlmacenDestino(r.getIdAlmacenDestino())
                        .referenciaModulo(r.getReferenciaModulo())
                        .idReferencia(r.getIdReferencia())
                        .build())
                .toList();
    }
}
