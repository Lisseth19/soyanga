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
      SELECT p FROM PresentacionProducto p
      WHERE (:idProducto IS NULL OR p.idProducto = :idProducto)
        AND (:pattern IS NULL OR UPPER(p.codigoSku) LIKE :pattern)
        AND (:estadoActivo IS NULL OR p.estadoActivo = :estadoActivo)
      """)
  Page<PresentacionProducto> buscar(@Param("idProducto") Long idProducto,
      @Param("pattern") String pattern,
      @Param("estadoActivo") Boolean estadoActivo,
      Pageable pageable);
}
