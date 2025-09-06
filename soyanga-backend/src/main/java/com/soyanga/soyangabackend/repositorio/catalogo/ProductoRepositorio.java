package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Producto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

public interface ProductoRepositorio extends BaseRepository<Producto, Long> {

    @Query("""
       SELECT p FROM Producto p
       WHERE (:q IS NULL OR LOWER(p.nombreProducto) LIKE CONCAT('%', LOWER(:q), '%'))
       """)
    Page<Producto> buscar(String q, Pageable pageable);
}
