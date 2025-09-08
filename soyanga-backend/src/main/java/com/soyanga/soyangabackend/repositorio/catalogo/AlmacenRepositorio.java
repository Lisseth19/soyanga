package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Almacen;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
// Usa este import si ya tienes BaseRepository; si no, comenta esta línea
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Si NO tienes BaseRepository aún, cambia la siguiente línea por:
// public interface AlmacenRepositorio extends org.springframework.data.jpa.repository.JpaRepository<Almacen, Long> {
public interface AlmacenRepositorio extends BaseRepository<Almacen, Long> {

    // Para el combo "opciones" (id, nombre) — mantiene tu endpoint /almacenes/opciones
    @Query(value = """
        SELECT a.id_almacen AS id, a.nombre_almacen AS nombre
        FROM almacenes a
        WHERE (:soloActivos = false OR a.estado_activo = TRUE)
        ORDER BY a.nombre_almacen ASC
        """, nativeQuery = true)
    List<OpcionIdNombre> opciones(@Param("soloActivos") boolean soloActivos);

    // Extra útil si filtras por sucursal
    List<Almacen> findByIdSucursalAndEstadoActivoTrue(Long idSucursal);
}
