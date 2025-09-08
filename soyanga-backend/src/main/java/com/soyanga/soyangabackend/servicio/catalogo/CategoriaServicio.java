package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.CategoriaProducto;
import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.repositorio.catalogo.CategoriaProductoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoriaServicio {

    private final CategoriaProductoRepositorio repo;

    public Page<CategoriaDTO> buscar(String q, Pageable pageable) {
        return repo.buscar((q == null || q.isBlank()) ? null : q.trim(), pageable)
                .map(this::toDTO);
    }

    public CategoriaDTO obtener(Long id) {
        var c = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
        return toDTO(c);
    }

    @Transactional
    public CategoriaDTO crear(CategoriaCrearDTO dto) {
        var c = CategoriaProducto.builder()
                .nombreCategoria(dto.getNombreCategoria().trim())
                .descripcion(dto.getDescripcion())
                .idCategoriaPadre(dto.getIdCategoriaPadre())
                .build();
        return toDTO(repo.save(c));
    }

    @Transactional
    public CategoriaDTO actualizar(Long id, CategoriaActualizarDTO dto) {
        var c = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
        if (dto.getNombreCategoria() != null) c.setNombreCategoria(dto.getNombreCategoria().trim());
        if (dto.getDescripcion() != null) c.setDescripcion(dto.getDescripcion());
        if (dto.getIdCategoriaPadre() != null) c.setIdCategoriaPadre(dto.getIdCategoriaPadre());
        return toDTO(repo.save(c));
    }

    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    private CategoriaDTO toDTO(CategoriaProducto c) {
        return CategoriaDTO.builder()
                .idCategoria(c.getIdCategoria())
                .nombreCategoria(c.getNombreCategoria())
                .descripcion(c.getDescripcion())
                .idCategoriaPadre(c.getIdCategoriaPadre())
                .build();
    }
}
