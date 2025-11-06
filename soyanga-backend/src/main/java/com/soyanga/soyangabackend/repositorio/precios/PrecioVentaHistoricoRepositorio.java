package com.soyanga.soyangabackend.repositorio.precios;

import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.time.LocalDateTime;

public interface PrecioVentaHistoricoRepositorio extends BaseRepository<PrecioVentaHistorico, Long> {

  Page<PrecioVentaHistorico> findByIdPresentacionOrderByFechaInicioVigenciaDesc(Long idPresentacion,
      Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<PrecioVentaHistorico> findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(
      Long idPresentacion);

  Page<PrecioVentaHistorico> findByIdPresentacion(Long idPresentacion, Pageable pageable);

  @Query(value = """
      select *
      from precios_de_venta_historicos h
      where h.id_presentacion = :id
        and h.fecha_inicio_vigencia >= coalesce(CAST(:desde AS timestamp), '-infinity'::timestamp)
        and h.fecha_inicio_vigencia <= coalesce(CAST(:hasta AS timestamp),  'infinity'::timestamp)
        and (:motivo  is null or h.motivo_cambio ilike ('%' || CAST(:motivo AS text)  || '%'))
        and (:usuario is null or h.usuario       ilike ('%' || CAST(:usuario AS text) || '%'))
      order by h.fecha_inicio_vigencia desc
      """, countQuery = """
      select count(*)
      from precios_de_venta_historicos h
      where h.id_presentacion = :id
        and h.fecha_inicio_vigencia >= coalesce(CAST(:desde AS timestamp), '-infinity'::timestamp)
        and h.fecha_inicio_vigencia <= coalesce(CAST(:hasta AS timestamp),  'infinity'::timestamp)
        and (:motivo  is null or h.motivo_cambio ilike ('%' || CAST(:motivo AS text)  || '%'))
        and (:usuario is null or h.usuario       ilike ('%' || CAST(:usuario AS text) || '%'))
      """, nativeQuery = true)
  Page<PrecioVentaHistorico> buscarFiltrado(
      @Param("id") Long idPresentacion,
      @Param("desde") LocalDateTime desde,
      @Param("hasta") LocalDateTime hasta,
      @Param("motivo") String motivo,
      @Param("usuario") String usuario,
      Pageable pageable);

}
