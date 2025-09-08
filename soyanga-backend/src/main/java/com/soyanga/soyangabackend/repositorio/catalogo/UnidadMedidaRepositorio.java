package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.UnidadMedida;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

public interface UnidadMedidaRepositorio extends BaseRepository<UnidadMedida, Long> {

    @Query("""
       SELECT u FROM UnidadMedida u
       WHERE (:q IS NULL OR LOWER(u.nombreUnidad) LIKE CONCAT('%', LOWER(:q), '%') OR LOWER(u.simboloUnidad) LIKE CONCAT('%', LOWER(:q), '%'))
       """)
    Page<UnidadMedida> buscar(String q, Pageable pageable);

}
