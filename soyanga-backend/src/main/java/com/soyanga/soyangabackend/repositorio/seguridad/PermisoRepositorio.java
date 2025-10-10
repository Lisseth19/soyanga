package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.Permiso;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PermisoRepositorio extends BaseRepository<Permiso, Long> {

    @Query("""
    SELECT p FROM Permiso p
    WHERE (COALESCE(:q, '') = '' 
           OR LOWER(p.nombrePermiso) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(COALESCE(p.descripcion, '')) LIKE LOWER(CONCAT('%', :q, '%')))
      AND (:soloActivos = FALSE OR p.estadoActivo = TRUE)
    """)
    Page<Permiso> buscar(@Param("q") String q,
                         @Param("soloActivos") boolean soloActivos,
                         Pageable pageable);

    Optional<Permiso> findByNombrePermiso(String nombrePermiso);
}
