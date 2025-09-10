package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Moneda;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MonedaRepositorio extends JpaRepository<Moneda, Long> {

    Optional<Moneda> findByCodigoMonedaIgnoreCase(String codigo);

    @Query("""
           select m
           from Moneda m
           where (:pattern is null or
                 lower(m.codigoMoneda) like :pattern or
                 lower(m.nombreMoneda) like :pattern)
             and (:activos is null or m.estadoActivo = :activos)
           """)
    Page<Moneda> buscar(@Param("pattern") String pattern,
                        @Param("activos") Boolean activos,
                        Pageable pageable);

    @Query("select m from Moneda m where m.esMonedaLocal = true")
    Optional<Moneda> findLocal();

    @Query("""
           select m
           from Moneda m
           where m.esMonedaLocal = false
             and (:activos is null or m.estadoActivo = :activos)
           order by m.nombreMoneda asc
           """)
    List<Moneda> listarNoLocales(@Param("activos") Boolean activos);
}
