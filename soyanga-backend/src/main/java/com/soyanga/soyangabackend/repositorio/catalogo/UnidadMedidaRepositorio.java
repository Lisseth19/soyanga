package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.UnidadMedida;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UnidadMedidaRepositorio extends BaseRepository<UnidadMedida, Long> {

    @Query("""
                select u
                from UnidadMedida u
                where (:pat is null
                       or lower(u.nombreUnidad)  like :pat
                       or lower(u.simboloUnidad) like :pat)
                order by u.nombreUnidad
            """)
    Page<UnidadMedida> buscar(@Param("pat") String pat, Pageable pageable);
}
