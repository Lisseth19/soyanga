package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.CategoriaProducto;
import com.soyanga.soyangabackend.dto.catalogo.CategoriaActualizarDTO;
import com.soyanga.soyangabackend.dto.catalogo.CategoriaCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.CategoriaDTO;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.repositorio.catalogo.CategoriaProductoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CategoriaServicio {

    private final CategoriaProductoRepositorio repo;

    /* ====================== QUERIES ====================== */

    @Transactional(readOnly = true)
    public Page<CategoriaDTO> buscar(String q, Long idPadre, boolean soloRaices, Pageable pageable) {
        // Patrón para LIKE en minúsculas (evita text~~bytea)
        String pat = (q == null || q.isBlank())
                ? null
                : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        return repo.buscar(pat, idPadre, soloRaices, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<OpcionIdNombre> opciones(String q, Long idPadre) {
        String filtro = (q == null || q.isBlank()) ? null : q.trim();
        return repo.opciones(filtro, idPadre);
    }

    @Transactional(readOnly = true)
    public CategoriaDTO obtener(Long id) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada: " + id));
        return toDTO(c);
    }

    /* ====================== COMANDOS ====================== */

    @Transactional
    public CategoriaDTO crear(CategoriaCrearDTO dto) {
        Long idPadre = dto.getIdCategoriaPadre();

        // Validar existencia del padre si se envía
        if (idPadre != null) {
            repo.findById(idPadre).orElseThrow(
                    () -> new IllegalArgumentException("Categoría padre no existe: " + idPadre));
        }

        var c = CategoriaProducto.builder()
                .nombreCategoria(dto.getNombreCategoria().trim())
                .descripcion(nullIfBlank(dto.getDescripcion()))
                .idCategoriaPadre(idPadre)
                .build();

        c = repo.save(c);
        return toDTO(c);
    }

    @Transactional
    public CategoriaDTO actualizar(Long id, CategoriaActualizarDTO dto) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada: " + id));

        if (dto.getNombreCategoria() != null) {
            c.setNombreCategoria(dto.getNombreCategoria().trim());
        }
        if (dto.getDescripcion() != null) {
            c.setDescripcion(nullIfBlank(dto.getDescripcion()));
        }
        if (dto.getIdCategoriaPadre() != null) {
            Long idPadre = dto.getIdCategoriaPadre();
            if (idPadre != null) {
                if (id.equals(idPadre)) {
                    throw new IllegalArgumentException("Una categoría no puede ser su propio padre.");
                }
                repo.findById(idPadre).orElseThrow(
                        () -> new IllegalArgumentException("Categoría padre no existe: " + idPadre));
            }
            c.setIdCategoriaPadre(idPadre);
        }

        c = repo.save(c);
        return toDTO(c);
    }

    @Transactional
    public void eliminar(Long id) {
        // Si debes proteger por FK, haz soft-delete (estado) en vez de delete.
        repo.deleteById(id);
    }

    /** Activar/Desactivar (si tu entidad tiene estadoActivo). */
    @Transactional
    public CategoriaDTO cambiarEstado(Long id, boolean activo) {
        var c = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada: " + id));

        // Descomenta/ajusta si tu entidad posee el campo:
        // c.setEstadoActivo(activo);

        c = repo.save(c);
        return toDTO(c);
    }

    /* ====================== HELPERS ====================== */

    private String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private CategoriaDTO toDTO(CategoriaProducto c) {
        return CategoriaDTO.builder()
                .idCategoria(c.getIdCategoria())
                .nombreCategoria(c.getNombreCategoria())
                .descripcion(c.getDescripcion())
                .idCategoriaPadre(c.getIdCategoriaPadre())
                // Si tu DTO maneja estado, añade:
                // .estadoActivo(Boolean.TRUE.equals(c.getEstadoActivo()))
                .build();
    }
}
