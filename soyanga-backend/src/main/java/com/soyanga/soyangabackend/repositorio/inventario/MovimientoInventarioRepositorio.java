package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

public interface MovimientoInventarioRepositorio extends BaseRepository<MovimientoInventario, Long> {

    @Query("""
        SELECT m FROM MovimientoInventario m
        WHERE m.idLote = :idLote
          AND (:idAlmacen IS NULL OR m.idAlmacenOrigen = :idAlmacen OR m.idAlmacenDestino = :idAlmacen)
        ORDER BY m.fechaMovimiento DESC
    """)
    Page<MovimientoInventario> listarPorLote(Long idLote, Long idAlmacen, Pageable pageable);

    Page<MovimientoInventario> findByIdLoteOrderByFechaMovimientoDesc(Long idLote, Pageable pageable);
}
