package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.ExistenciaPorLote;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExistenciaLoteRepositorio extends BaseRepository<ExistenciaPorLote, Long> {

  @Query(
          value = "select case when count(*) > 0 then true else false end " +
                  "from existencias_por_lote where id_lote = :idLote",
          nativeQuery = true
  )
  boolean existsByIdLote(@Param("idLote") Long idLote);


  Optional<ExistenciaPorLote> findByIdAlmacenAndIdLote(Long idAlmacen, Long idLote);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from ExistenciaPorLote e where e.idAlmacen = :idAlmacen and e.idLote = :idLote")
  Optional<ExistenciaPorLote> lockByAlmacenAndIdLote(@Param("idAlmacen") Long idAlmacen,
                                                     @Param("idLote") Long idLote);

  // ======= LEGACY: devuelve entidades completas con stock disponible > 0 (FEFO simple) =======
  @Query(value = """
        SELECT e.*
        FROM existencias_por_lote e
        JOIN lotes l ON l.id_lote = e.id_lote
        WHERE e.id_almacen = :almacenId
          AND l.id_presentacion = :presentacionId
          AND e.cantidad_disponible > 0
        ORDER BY l.fecha_vencimiento ASC, l.id_lote ASC
        LIMIT CAST(:lim AS INT)
        """, nativeQuery = true)
  List<ExistenciaPorLote> pickFefo(@Param("almacenId") Long almacenId,
                                   @Param("presentacionId") Long presentacionId,
                                   @Param("lim") int limit);

  // ======= LEGACY: proyección que expone "disponible" (ojo: no resta reservada porque disponible ya es libre) =======
  @org.springframework.data.jpa.repository.Query(value = """
    SELECT el.id_lote      AS idLote,
           el.cantidad_disponible AS disponible,
           l.fecha_vencimiento    AS fechaVencimiento,
           l.numero_lote          AS numeroLote
    FROM existencias_por_lote el
    JOIN lotes l ON l.id_lote = el.id_lote
    WHERE el.id_almacen = :idAlmacen
      AND l.id_presentacion = :idPresentacion
      AND el.cantidad_disponible > 0
    ORDER BY l.fecha_vencimiento ASC, l.id_lote ASC
    """, nativeQuery = true)
  java.util.List<FefoRow> fefoPorPresentacion(
          @org.springframework.data.repository.query.Param("idAlmacen") Long idAlmacen,
          @org.springframework.data.repository.query.Param("idPresentacion") Long idPresentacion
  );

  public interface FefoRow {
    Long getIdLote();
    java.math.BigDecimal getDisponible();
    java.time.LocalDate getFechaVencimiento();
    String getNumeroLote();
  }

  // ======= LEGACY: candidatos FEFO devolviendo entidades (incluye filas con reservada>0). Mantener por compatibilidad. =======
  @Query(value = """
        SELECT e.*
        FROM existencias_por_lote e
        JOIN lotes l ON l.id_lote = e.id_lote
        WHERE e.id_almacen = :idAlmacen
          AND l.id_presentacion = :idPresentacion
          AND (e.cantidad_disponible > 0 OR e.cantidad_reservada > 0)
        ORDER BY l.fecha_vencimiento ASC, e.id_existencia_lote ASC
        """, nativeQuery = true)
  List<ExistenciaPorLote> fefoCandidatosPorPresentacion(@Param("idAlmacen") Long idAlmacen,
                                                        @Param("idPresentacion") Long idPresentacion);

  // ======= NUEVO: FEFO mínimo con "reservable" (equivale a cantidad_disponible) y solo cuando > 0 =======
  @Query(value = """
            SELECT 
                l.id_lote               AS idLote,
                e.cantidad_disponible   AS reservable,
                l.fecha_vencimiento     AS fechaVencimiento,
                l.numero_lote           AS numeroLote
            FROM existencias_por_lote e
            JOIN lotes l ON l.id_lote = e.id_lote
            WHERE e.id_almacen = :idAlmacen
              AND l.id_presentacion = :idPresentacion
              AND e.cantidad_disponible > 0
            ORDER BY l.fecha_vencimiento NULLS LAST, l.id_lote
            """, nativeQuery = true)
  List<FefoCandidatoMin> fefoCandidatosReservablesMin(@Param("idAlmacen") Long idAlmacen,
                                                      @Param("idPresentacion") Long idPresentacion);

  interface FefoCandidatoMin {
    Long getIdLote();
    java.math.BigDecimal getReservable();         // == cantidad_disponible
    java.time.LocalDate getFechaVencimiento();    // ajusta a LocalDateTime si tu columna es timestamp
    String getNumeroLote();
  }

  // ======= NUEVO: total reservable (suma de cantidad_disponible) para validaciones rápidas =======
  @Query(value = """
            SELECT COALESCE(SUM(e.cantidad_disponible), 0)
            FROM existencias_por_lote e
            JOIN lotes l ON l.id_lote = e.id_lote
            WHERE e.id_almacen = :idAlmacen
              AND l.id_presentacion = :idPresentacion
            """, nativeQuery = true)
  java.math.BigDecimal totalReservablePorPresentacion(@Param("idAlmacen") Long idAlmacen,
                                                      @Param("idPresentacion") Long idPresentacion);
}
