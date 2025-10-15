package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.UsuarioRol;
import com.soyanga.soyangabackend.dto.seguridad.RolListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UsuarioRolRepositorio extends BaseRepository<UsuarioRol, Long> {
    List<UsuarioRol> findByIdUsuario(Long idUsuario);
    void deleteByIdUsuario(Long idUsuario);
    boolean existsByIdUsuarioAndIdRol(Long idUsuario, Long idRol);
    long countByIdRol(Long idRol);
    void deleteByIdUsuarioAndIdRol(Long idUsuario, Long idRol);
    @Query("""
   select r.idRol as idRol,
          r.nombreRol as nombreRol,
          r.descripcion as descripcion,
          r.estadoActivo as estadoActivo
   from Rol r
   where (:q is null or upper(r.nombreRol) like concat('%', upper(:q), '%'))
""")
    Page<RolListadoProjection> listar(String q, Pageable pageable);

}
