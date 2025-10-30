package com.soyanga.soyangabackend.repositorio.inventario;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.soyanga.soyangabackend.dominio.Auditoria;
import com.soyanga.soyangabackend.dto.seguridad.AuditoriaListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditoriaRepositorio extends BaseRepository<Auditoria, Long> {
  @Query(value = """
      SELECT
        a.id_auditoria          AS idAuditoria,
        a.fecha_evento          AS fechaEvento,
        a.id_usuario            AS idUsuario,
        u.nombre_completo       AS usuario,
        a.modulo_afectado       AS moduloAfectado,
        a.accion                AS accion,
        a.id_registro_afectado  AS idRegistroAfectado,
        a.detalle               AS detalle
      FROM auditorias a
      LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
      WHERE
        (:usuarioId IS NULL OR a.id_usuario = :usuarioId)
        AND (:modulo  IS NULL OR a.modulo_afectado ILIKE CONCAT('%', CAST(:modulo AS TEXT), '%'))
        AND (:accion  IS NULL OR a.accion           ILIKE CONCAT('%', CAST(:accion AS TEXT), '%'))
        -- rango de fechas: desde inclusive, hasta exclusivo (día siguiente)
        AND (:desde   IS NULL OR a.fecha_evento >= CAST(:desde AS DATE))
        AND (:hasta   IS NULL OR a.fecha_evento <  CAST(:hasta AS DATE) + INTERVAL '1 day')
        AND (
             :q IS NULL
             OR a.detalle         ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR a.modulo_afectado ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR a.accion          ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR COALESCE(
                  NULLIF(u.nombre_completo, ''),
                  NULLIF(u.nombre_usuario,  ''),
                  NULLIF(u.correo_electronico, '')
                )                 ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
        )
      ORDER BY a.fecha_evento DESC, a.id_auditoria DESC
      """, countQuery = """
      SELECT COUNT(*)
      FROM auditorias a
      LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
      WHERE
        (:usuarioId IS NULL OR a.id_usuario = :usuarioId)
        AND (:modulo  IS NULL OR a.modulo_afectado ILIKE CONCAT('%', CAST(:modulo AS TEXT), '%'))
        AND (:accion  IS NULL OR a.accion           ILIKE CONCAT('%', CAST(:accion AS TEXT), '%'))
        AND (:desde   IS NULL OR a.fecha_evento >= CAST(:desde AS DATE))
        AND (:hasta   IS NULL OR a.fecha_evento <  CAST(:hasta AS DATE) + INTERVAL '1 day')
        AND (
             :q IS NULL
             OR a.detalle         ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR a.modulo_afectado ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR a.accion          ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR COALESCE(
                  NULLIF(u.nombre_completo, ''),
                  NULLIF(u.nombre_usuario,  ''),
                  NULLIF(u.correo_electronico, '')
                )                 ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
        )
      """, nativeQuery = true)
  Page<AuditoriaListadoProjection> listar(
      @Param("usuarioId") Long usuarioId,
      @Param("modulo") String modulo,
      @Param("accion") String accion,
      @Param("desde") String desde, // yyyy-MM-dd
      @Param("hasta") String hasta, // yyyy-MM-dd
      @Param("q") String q,
      Pageable pageable);
}
