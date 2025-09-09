package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.Proveedor;
import com.soyanga.soyangabackend.dto.proveedores.ProveedorListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProveedorRepositorio extends BaseRepository<Proveedor, Long> {

    @Query(value = """
        SELECT
          p.id_proveedor          AS idProveedor,
          p.razon_social          AS razonSocial,
          p.nit                   AS nit,
          p.contacto              AS contacto,
          p.telefono              AS telefono,
          p.correo_electronico    AS correoElectronico,
          p.estado_activo         AS estadoActivo
        FROM proveedores p
        WHERE (:q IS NULL
               OR p.razon_social       ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR p.nit                ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR p.contacto           ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR p.estado_activo = TRUE)
        ORDER BY p.razon_social ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM proveedores p
        WHERE (:q IS NULL
               OR p.razon_social       ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR p.nit                ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR p.contacto           ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR p.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<ProveedorListadoProjection> listar(
            @Param("q") String q,
            @Param("soloActivos") boolean soloActivos,
            Pageable pageable
    );
}
