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

  // JPQL correcto contra la entidad CategoriaProducto.
  // Compara LOWER(columna) con el parámetro ya minúsculo (qLower).
  @Query("""
      select c from CategoriaProducto c
      where (:qLower is null or
             lower(c.nombreCategoria) like concat('%', :qLower, '%') or
             lower(coalesce(c.descripcion, '')) like concat('%', :qLower, '%'))
        and (:idPadre is null or c.idCategoriaPadre = :idPadre)
        and (:soloRaices = false or c.idCategoriaPadre is null)
      order by c.nombreCategoria
      """)
  Page<CategoriaProducto> buscar(@Param("qLower") String qLower,
      @Param("idPadre") Long idPadre,
      @Param("soloRaices") boolean soloRaices,
      Pageable pageable);

  // Opciones: opción B (nativa) con ILIKE + CAST para evitar problemas de tipos.
  @Query(value = """
      SELECT c.id_categoria AS id, c.nombre_categoria AS nombre
      FROM categorias_de_productos c
      WHERE (:q IS NULL OR c.nombre_categoria ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
        AND (:idPadre IS NULL OR c.id_categoria_padre = :idPadre)
      ORDER BY c.nombre_categoria ASC
      """, nativeQuery = true)
  List<OpcionIdNombre> opciones(@Param("q") String q, @Param("idPadre") Long idPadre);

}
