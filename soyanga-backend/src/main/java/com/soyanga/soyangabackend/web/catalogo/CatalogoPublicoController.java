package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.ProductoDTO;
import com.soyanga.soyangabackend.dto.catalogo.PresentacionDTO;
import com.soyanga.soyangabackend.dto.catalogo.CategoriaDTO;
import com.soyanga.soyangabackend.dto.catalogo.UnidadDTO; // ← asegúrate de tener este DTO
import com.soyanga.soyangabackend.servicio.catalogo.ProductoServicio;
import com.soyanga.soyangabackend.servicio.catalogo.PresentacionServicio;
import com.soyanga.soyangabackend.servicio.catalogo.CategoriaServicio;
import com.soyanga.soyangabackend.servicio.catalogo.UnidadServicio; // ← asegúrate de tener este servicio

import jakarta.annotation.security.PermitAll;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/catalogo/publico")
@RequiredArgsConstructor
public class CatalogoPublicoController {

    private final ProductoServicio productoServicio;
    private final PresentacionServicio presentacionServicio;
    private final CategoriaServicio categoriaServicio;
    private final UnidadServicio unidadServicio; // ← NUEVO

    /**
     * Lista pública de productos ACTIVOS (para el catálogo).
     * GET /api/v1/catalogo/publico/productos?q=xxx&idCategoria=1&page=0&size=24
     */
    @PermitAll
    @GetMapping("/productos")
    public Page<ProductoPublicoResumenDTO> listarProductos(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long idCategoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("nombreProducto").ascending());

        // buscar(String q, Long idCategoria, Boolean soloActivos, Pageable pageable)
        Page<ProductoDTO> productos = productoServicio.buscar(q, idCategoria, true, pageable);

        Map<Long, String> cacheCat = new HashMap<>();

        List<ProductoPublicoResumenDTO> content = productos.getContent().stream().map(prod -> {
            // Presentaciones ACTIVAS (tope defensivo 100) para obtener portada y conteo
            Page<PresentacionDTO> pres = presentacionServicio.buscar(
                    prod.getIdProducto(), null, true, PageRequest.of(0, 100)
            );

            // Imagen de portada: primera disponible en presentaciones
            String imagen = pres.getContent().stream()
                    .map(PresentacionDTO::getImagenUrl)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);

            // Nombre de categoría (con mini-cache)
            String nombreCat = null;
            Long catId = prod.getIdCategoria();
            if (catId != null) {
                nombreCat = cacheCat.computeIfAbsent(catId, (cid) -> {
                    try {
                        CategoriaDTO c = categoriaServicio.obtener(cid);
                        return (c != null) ? c.getNombreCategoria() : null;
                    } catch (Exception e) {
                        return null;
                    }
                });
            }

            ProductoPublicoResumenDTO dto = new ProductoPublicoResumenDTO();
            dto.setIdProducto(prod.getIdProducto());
            dto.setNombreProducto(prod.getNombreProducto());
            dto.setDescripcion(prod.getDescripcion());
            dto.setIdCategoria(prod.getIdCategoria());
            dto.setCategoriaNombre(nombreCat);
            dto.setPrincipioActivo(prod.getPrincipioActivo());
            dto.setRegistroSanitario(prod.getRegistroSanitario());
            dto.setCantidadPresentaciones((int) pres.getTotalElements());
            dto.setImagenUrl(imagen);
            return dto;
        }).collect(Collectors.toList());

        return new PageImpl<>(content, productos.getPageable(), productos.getTotalElements());
    }

    /**
     * Detalle público por ID (presentaciones activas incluidas).
     * GET /api/v1/catalogo/publico/producto/{id}
     */
    @PermitAll
    @GetMapping("/producto/{id}")
    public ProductoPublicoDetalleDTO detalleProducto(@PathVariable Long id) {
        ProductoDTO prod = productoServicio.obtener(id);
        if (prod == null || Boolean.FALSE.equals(prod.getEstadoActivo())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }

        Page<PresentacionDTO> pres = presentacionServicio.buscar(
                id, null, true, PageRequest.of(0, 200)
        );

        String portada = pres.getContent().stream()
                .map(PresentacionDTO::getImagenUrl)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        String nombreCat = null;
        Long catId = prod.getIdCategoria();
        if (catId != null) {
            try {
                CategoriaDTO c = categoriaServicio.obtener(catId);
                nombreCat = (c != null) ? c.getNombreCategoria() : null;
            } catch (Exception ignored) { }
        }

        // Cache local de unidades por idUnidad
        Map<Long, UnidadDTO> unidadCache = new HashMap<>();

        ProductoPublicoDetalleDTO out = new ProductoPublicoDetalleDTO();
        out.setIdProducto(prod.getIdProducto());
        out.setNombreProducto(prod.getNombreProducto());
        out.setDescripcion(prod.getDescripcion());
        out.setIdCategoria(prod.getIdCategoria());
        out.setCategoriaNombre(nombreCat);
        out.setPrincipioActivo(prod.getPrincipioActivo());
        out.setRegistroSanitario(prod.getRegistroSanitario());
        out.setImagenUrl(portada);

        List<PresentacionPublicaDTO> presentaciones = pres.getContent().stream().map(p -> {
            PresentacionPublicaDTO x = new PresentacionPublicaDTO();
            x.setIdPresentacion(p.getIdPresentacion());
            x.setCodigoSku(p.getCodigoSku());
            x.setIdUnidad(p.getIdUnidad());
            x.setContenidoPorUnidad(p.getContenidoPorUnidad());
            x.setPrecioVentaBob(p.getPrecioVentaBob()); // puede venir null
            x.setImagenUrl(p.getImagenUrl());

            // Rellenar unidad (nombre y símbolo) desde servicio (con cache)
            if (p.getIdUnidad() != null) {
                UnidadDTO u = unidadCache.computeIfAbsent(p.getIdUnidad(), (uid) -> {
                    try { return unidadServicio.obtener(uid); } catch (Exception e) { return null; }
                });
                if (u != null) {
                    x.setUnidadNombre(u.getNombreUnidad());   // ajusta getters según tu DTO real
                    x.setUnidadSimbolo(u.getSimboloUnidad());
                }
            }
            return x;
        }).toList();

        out.setPresentaciones(presentaciones);
        return out;
    }

    /* ================== DTOs Públicos (visibles en frontend) ================== */

    @Data
    public static class ProductoPublicoResumenDTO {
        private Long idProducto;
        private String nombreProducto;
        private String descripcion;

        private Long idCategoria;
        private String categoriaNombre;

        private String principioActivo;
        private String registroSanitario;

        private Integer cantidadPresentaciones;
        private String imagenUrl;
    }

    @Data
    public static class ProductoPublicoDetalleDTO {
        private Long idProducto;
        private String nombreProducto;
        private String descripcion;

        private Long idCategoria;
        private String categoriaNombre;

        private String principioActivo;
        private String registroSanitario;

        private String imagenUrl;
        private List<PresentacionPublicaDTO> presentaciones;
    }

    @Data
    public static class PresentacionPublicaDTO {
        private Long idPresentacion;
        private String codigoSku;
        private Long idUnidad;
        private java.math.BigDecimal contenidoPorUnidad;
        private java.math.BigDecimal precioVentaBob; // opcional
        private String imagenUrl;

        // NUEVO
        private String unidadNombre;
        private String unidadSimbolo;
    }
}
