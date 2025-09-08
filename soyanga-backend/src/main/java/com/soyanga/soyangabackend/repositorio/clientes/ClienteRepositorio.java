package com.soyanga.soyangabackend.repositorio.clientes;

import com.soyanga.soyangabackend.dominio.Cliente;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClienteRepositorio extends BaseRepository<Cliente, Long> {

    boolean existsByNitIgnoreCase(String nit);

    @Query(value = """
        SELECT * 
        FROM clientes c
        WHERE (:q IS NULL 
               OR c.razon_social_o_nombre ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR c.nit ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR c.estado_activo = TRUE)
        ORDER BY c.razon_social_o_nombre ASC
        """,
            countQuery = """
        SELECT COUNT(*) 
        FROM clientes c
        WHERE (:q IS NULL 
               OR c.razon_social_o_nombre ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR c.nit ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR c.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<Cliente> buscar(
            @Param("q") String q,
            @Param("soloActivos") boolean soloActivos,
            Pageable pageable
    );
}
