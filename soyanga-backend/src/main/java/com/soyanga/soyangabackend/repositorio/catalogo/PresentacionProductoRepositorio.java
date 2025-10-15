package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.PresentacionProducto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PresentacionProductoRepositorio extends BaseRepository<PresentacionProducto, Long> {

  java.util.Optional<PresentacionProducto> findByCodigoSku(String codigoSku);

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

}
