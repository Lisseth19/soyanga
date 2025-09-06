package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.CompraDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface CompraDetalleRepositorio extends BaseRepository<CompraDetalle, Long> {
    List<CompraDetalle> findByIdCompra(Long idCompra);
}
