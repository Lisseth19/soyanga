package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.Lote;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.Optional;

public interface LoteRepositorio extends BaseRepository<Lote, Long> {
    Optional<Lote> findByIdRecepcionDetalleAndNumeroLote(Long idRecepcionDetalle, String numeroLote);

    Optional<Lote> findByIdRecepcionDetalle(Long idRecepcionDetalle);
}
