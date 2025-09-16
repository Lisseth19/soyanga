package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Producto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductoRepositorio extends BaseRepository<Producto, Long> {

  /**
   * Búsqueda con patrón ya construido (ej. "%abc%") para evitar "text ~~ bytea".
   * No usamos concat ni ||, solo LIKE :pat.
   */
  @Query("""
      select p from Producto p
      where (:pat is null or
             lower(p.nombreProducto)           like :pat or
             lower(coalesce(p.descripcion, '')) like :pat or
             lower(coalesce(p.principioActivo, '')) like :pat or
             lower(coalesce(p.registroSanitario, '')) like :pat)
        and (:idCategoria is null or p.idCategoria = :idCategoria)
        and (:soloActivos = false or p.estadoActivo = true)
      """)
  Page<Producto> buscar(@Param("pat") String pat,
      @Param("idCategoria") Long idCategoria,
      @Param("soloActivos") boolean soloActivos,
      Pageable pageable);
}
