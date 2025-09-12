package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.UsuarioRol;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface UsuarioRolRepositorio extends BaseRepository<UsuarioRol, Long> {
    List<UsuarioRol> findByIdUsuario(Long idUsuario);
    void deleteByIdUsuario(Long idUsuario);
    boolean existsByIdUsuarioAndIdRol(Long idUsuario, Long idRol);
}
