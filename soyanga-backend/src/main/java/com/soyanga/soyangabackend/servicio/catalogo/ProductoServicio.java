package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Producto;
import com.soyanga.soyangabackend.dto.catalogo.ProductoActualizarDTO;
import com.soyanga.soyangabackend.dto.catalogo.ProductoCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.ProductoDTO;
import com.soyanga.soyangabackend.repositorio.catalogo.ProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio; // 👈 se mantiene

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ProductoServicio {

    private final ProductoRepositorio productoRepositorio;
    private final PresentacionProductoRepositorio presentacionRepositorio; // 👈 inyectado

    // Construye el patrón "%q%" en minúsculas y lo pasa como :pat
    public Page<ProductoDTO> buscar(String q, Long idCategoria, boolean soloActivos, Pageable pageable) {
        String pat = (q == null || q.isBlank())
                ? null
                : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        return productoRepositorio.buscar(pat, idCategoria, soloActivos, pageable)
                .map(this::toDTO);
    }

    public ProductoDTO obtener(Long id) {
        var p = productoRepositorio.findById(id)
                .orElseThrow(() -> new IllegalStateException("Producto no encontrado: " + id));
        return toDTO(p);
    }

    @Transactional
    public ProductoDTO crear(ProductoCrearDTO dto) {
        if (dto.getNombreProducto() == null || dto.getNombreProducto().isBlank()) {
            throw new IllegalStateException("El nombre del producto es requerido");
        }
        if (dto.getIdCategoria() == null) {
            throw new IllegalStateException("La categoría es requerida");
        }
        var p = Producto.builder()
                .nombreProducto(dto.getNombreProducto().trim())
                .descripcion(dto.getDescripcion())
                .idCategoria(dto.getIdCategoria())
                .principioActivo(dto.getPrincipioActivo())
                .registroSanitario(dto.getRegistroSanitario())
                .estadoActivo(true)
                .build();
        p = productoRepositorio.save(p);
        return toDTO(p);
    }

    @Transactional
    public ProductoDTO actualizar(Long id, ProductoActualizarDTO dto) {
        var p = productoRepositorio.findById(id)
                .orElseThrow(() -> new IllegalStateException("Producto no encontrado: " + id));

        if (dto.getNombreProducto() != null)
            p.setNombreProducto(dto.getNombreProducto().trim());
        if (dto.getDescripcion() != null)
            p.setDescripcion(dto.getDescripcion());
        if (dto.getIdCategoria() != null)
            p.setIdCategoria(dto.getIdCategoria());
        if (dto.getPrincipioActivo() != null)
            p.setPrincipioActivo(dto.getPrincipioActivo());
        if (dto.getRegistroSanitario() != null)
            p.setRegistroSanitario(dto.getRegistroSanitario());
        if (dto.getEstadoActivo() != null)
            p.setEstadoActivo(dto.getEstadoActivo());

        p = productoRepositorio.save(p);
        return toDTO(p);
    }

    /** Desactiva siempre, aunque tenga presentaciones */
    @Transactional
    public void desactivar(Long id) {
        var p = productoRepositorio.findById(id)
                .orElseThrow(() -> new IllegalStateException("Producto no encontrado: " + id));
        p.setEstadoActivo(false);
        productoRepositorio.save(p);
    }

    /** Elimina solo si NO tiene presentaciones */
    @Transactional
    public void eliminar(Long id) {
        var p = productoRepositorio.findById(id)
                .orElseThrow(() -> new IllegalStateException("Producto no encontrado: " + id));

        long n = presentacionRepositorio.countByIdProducto(id);
        if (n > 0) {
            // Mapea este mensaje a 409 CONFLICT en tu @ControllerAdvice si lo deseas
            throw new IllegalStateException("No se puede eliminar el producto porque tiene presentaciones.");
        }
        productoRepositorio.delete(p);
    }

    // --- mapeos ---
    private ProductoDTO toDTO(Producto p) {
        return ProductoDTO.builder()
                .idProducto(p.getIdProducto())
                .nombreProducto(p.getNombreProducto())
                .descripcion(p.getDescripcion())
                .idCategoria(p.getIdCategoria())
                .principioActivo(p.getPrincipioActivo())
                .registroSanitario(p.getRegistroSanitario())
                .estadoActivo(p.getEstadoActivo())
                .build();
    }
}
