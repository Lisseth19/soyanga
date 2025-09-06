package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.RecepcionPedido;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface RecepcionPedidoRepositorio extends BaseRepository<RecepcionPedido, Long> {
    List<RecepcionPedido> findByIdCompra(Long idCompra);
}
