package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.AjusteInventario;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.Optional;
import java.util.UUID;

public interface AjusteInventarioRepositorio extends BaseRepository<AjusteInventario, Long> {
    Optional<AjusteInventario> findByRequestId(UUID requestId);

    boolean existsByRequestId(UUID requestId);
}
