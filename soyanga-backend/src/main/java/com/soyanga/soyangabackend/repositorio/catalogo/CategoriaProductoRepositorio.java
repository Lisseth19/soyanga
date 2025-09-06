package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.CategoriaProducto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

public interface CategoriaProductoRepositorio extends BaseRepository<CategoriaProducto, Long> {

    @Query("""
       SELECT c FROM CategoriaProducto c
       WHERE (:q IS NULL OR LOWER(c.nombreCategoria) LIKE CONCAT('%', LOWER(:q), '%'))
       """)
    Page<CategoriaProducto> buscar(String q, Pageable pageable);
}
