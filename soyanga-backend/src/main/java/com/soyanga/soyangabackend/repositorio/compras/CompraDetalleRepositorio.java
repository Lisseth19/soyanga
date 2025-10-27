package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.CompraDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;
import java.util.Optional;

public interface CompraDetalleRepositorio extends BaseRepository<CompraDetalle, Long> {
    List<CompraDetalle> findByIdCompra(Long idCompra);

    // CompraDetalleRepositorio.java
    Optional<CompraDetalle> findByIdCompraAndIdPresentacion(Long idCompra, Long idPresentacion);

    boolean existsByIdCompra(Long IdCompra);

    long countByIdCompra(Long idCompra);

}
