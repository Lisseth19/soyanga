package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.CategoriaProducto;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoriaProductoRepositorio extends BaseRepository<CategoriaProducto, Long> {

  // IMPORTANTE: usar patrón preconstruido (:pat) para evitar "text ~~ bytea"
  @Query("""
      select c from CategoriaProducto c
      where (:pat is null or
             lower(c.nombreCategoria) like :pat or
             lower(coalesce(c.descripcion, '')) like :pat)
        and (:idPadre is null or c.idCategoriaPadre = :idPadre)
        and (:soloRaices = false or c.idCategoriaPadre is null)
      order by c.nombreCategoria
      """)
  Page<CategoriaProducto> buscar(@Param("pat") String pat,
      @Param("idPadre") Long idPadre,
      @Param("soloRaices") boolean soloRaices,
      Pageable pageable);

  // Opciones para combos (nativa) — ya segura con ILIKE + CAST
  @Query(value = """
      SELECT c.id_categoria AS id, c.nombre_categoria AS nombre
      FROM categorias_de_productos c
      WHERE (:q IS NULL OR c.nombre_categoria ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
        AND (:idPadre IS NULL OR c.id_categoria_padre = :idPadre)
      ORDER BY c.nombre_categoria ASC
      """, nativeQuery = true)
  List<OpcionIdNombre> opciones(@Param("q") String q, @Param("idPadre") Long idPadre);
}
