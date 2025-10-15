package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.RolPermiso;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RolPermisoRepositorio extends BaseRepository<RolPermiso, Long> {

    List<RolPermiso> findByIdRol(Long idRol);

    boolean existsByIdRolAndIdPermiso(Long idRol, Long idPermiso);

    @Modifying
    @Query(value = "DELETE FROM roles_permisos WHERE id_rol = :idRol AND id_permiso = :idPermiso", nativeQuery = true)
    void deleteByIdRolAndIdPermiso(@Param("idRol") Long idRol, @Param("idPermiso") Long idPermiso);

    @Modifying
    @Query(value = "DELETE FROM roles_permisos WHERE id_rol = :idRol", nativeQuery = true)
    void deleteByIdRol(@Param("idRol") Long idRol);

}
