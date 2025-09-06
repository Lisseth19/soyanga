package com.soyanga.soyangabackend.repositorio.precios;

import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface PrecioVentaHistoricoRepositorio extends BaseRepository<PrecioVentaHistorico, Long> {

    Page<PrecioVentaHistorico> findByIdPresentacionOrderByFechaInicioVigenciaDesc(Long idPresentacion, Pageable pageable);

    Optional<PrecioVentaHistorico> findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(Long idPresentacion);
}
