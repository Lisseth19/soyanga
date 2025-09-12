package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.Permiso;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PermisoRepositorio extends BaseRepository<Permiso, Long> {

    @Query("""
    SELECT p FROM Permiso p
    WHERE (:q = '' OR LOWER(p.nombrePermiso) LIKE LOWER(CONCAT('%', :q, '%')))
      AND (:soloActivos = FALSE OR p.estadoActivo = TRUE)
    ORDER BY p.nombrePermiso ASC
    """)
    Page<Permiso> buscar(@Param("q") String q,
                         @Param("soloActivos") boolean soloActivos,
                         Pageable pageable);

}
