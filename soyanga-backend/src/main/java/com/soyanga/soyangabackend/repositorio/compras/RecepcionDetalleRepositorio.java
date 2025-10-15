package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.RecepcionDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecepcionDetalleRepositorio extends BaseRepository<RecepcionDetalle, Long> {
    List<RecepcionDetalle> findByIdRecepcion(Long idRecepcion);

    @Query("""
              select coalesce(sum(rd.cantidadRecibida), 0)
              from RecepcionDetalle rd
              join RecepcionPedido r on r.idRecepcion = rd.idRecepcion
              where rd.idCompraDetalle = :idCompraDetalle
                and lower(r.estadoRecepcion) <> 'anulada'
            """)
    BigDecimal totalRecibidoActivoPorDetalle(@Param("idCompraDetalle") Long idCompraDetalle);
}
