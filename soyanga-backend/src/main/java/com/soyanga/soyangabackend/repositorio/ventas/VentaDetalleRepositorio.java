package com.soyanga.soyangabackend.repositorio.ventas;

import com.soyanga.soyangabackend.dominio.VentaDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface VentaDetalleRepositorio extends BaseRepository<VentaDetalle, Long> {
    List<VentaDetalle> findByIdVenta(Long idVenta);
}
