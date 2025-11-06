package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.PresentacionProducto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PresentacionProductoRepositorio extends BaseRepository<PresentacionProducto, Long> {

  Optional<PresentacionProducto> findByCodigoSku(String codigoSku);

  /** Para validar eliminación de producto (hard delete) */
  long countByIdProducto(Long idProducto);
  boolean existsByIdProducto(Long idProducto);

  /** Útiles si quieres validar/mostrar solo presentaciones activas */
  long countByIdProductoAndEstadoActivoTrue(Long idProducto);
  boolean existsByIdProductoAndEstadoActivoTrue(Long idProducto);

  @Query("""
      SELECT p
      FROM PresentacionProducto p
      LEFT JOIN Producto pr ON pr.idProducto = p.idProducto
      WHERE (:idProducto IS NULL OR p.idProducto = :idProducto)
        AND (:estadoActivo IS NULL OR p.estadoActivo = :estadoActivo)
        AND (
             :pattern IS NULL
             OR UPPER(p.codigoSku) LIKE :pattern
             OR (pr IS NOT NULL AND UPPER(pr.nombreProducto) LIKE :pattern)
        )
      """)
  Page<PresentacionProducto> buscar(@Param("idProducto") Long idProducto,

      @Param("pattern") String pattern,
      @Param("estadoActivo") Boolean estadoActivo,
      Pageable pageable);

  @Query("select p from PresentacionProducto p where p.estadoActivo = true")
  List<PresentacionProducto> findActivas();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from PresentacionProducto p where p.idPresentacion = :id")
  Optional<PresentacionProducto> lockById(@Param("id") Long idPresentacion);


}
