package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.CategoriaProducto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface CategoriaProductoRepositorio extends BaseRepository<CategoriaProducto, Long> {
    List<CategoriaProducto> findByIdCategoriaPadre(Long idCategoriaPadre);
}
