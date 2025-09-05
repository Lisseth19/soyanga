package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.vistas.InventarioPorLoteView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface InventarioPorLoteRepositorio extends JpaRepository<InventarioPorLoteView, Long> {

    @Query(
            value = """
        SELECT *
        FROM vw_inventario_por_lote
        WHERE (:almacenId IS NULL OR id_almacen = :almacenId)
          AND (
               :texto IS NULL
               OR sku ILIKE ('%' || :texto || '%')
               OR producto ILIKE ('%' || :texto || '%')
          )
          AND vencimiento <= COALESCE(:venceAntes, '9999-12-31'::date)
        """,
            countQuery = """
        SELECT COUNT(1)
        FROM vw_inventario_por_lote
        WHERE (:almacenId IS NULL OR id_almacen = :almacenId)
          AND (
               :texto IS NULL
               OR sku ILIKE ('%' || :texto || '%')
               OR producto ILIKE ('%' || :texto || '%')
          )
          AND vencimiento <= COALESCE(:venceAntes, '9999-12-31'::date)
        """,
            nativeQuery = true
    )
    Page<InventarioPorLoteView> buscar(
            @Param("almacenId") Long almacenId,
            @Param("texto") String texto,
            @Param("venceAntes") java.sql.Date venceAntes,  // mantenemos java.sql.Date
            Pageable pageable
    );
}
