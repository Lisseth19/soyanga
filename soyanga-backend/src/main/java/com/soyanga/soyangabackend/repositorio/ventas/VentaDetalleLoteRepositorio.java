package com.soyanga.soyangabackend.repositorio.ventas;

import com.soyanga.soyangabackend.dominio.VentaDetalleLote;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface VentaDetalleLoteRepositorio extends BaseRepository<VentaDetalleLote, Long> {
    List<VentaDetalleLote> findByIdVentaDetalle(Long idVentaDetalle);
}
