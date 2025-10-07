package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.CodigoBarras;
import com.soyanga.soyangabackend.dominio.PresentacionProducto;
import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.repositorio.catalogo.CodigoBarrasRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.soyanga.soyangabackend.servicio.archivos.StorageService;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.EntityNotFoundException;

@Service
@RequiredArgsConstructor
public class PresentacionServicio {

    private final PresentacionProductoRepositorio presentacionRepo;
    private final CodigoBarrasRepositorio codigoRepo;

    // NUEVO
    private final StorageService storage;

    public Page<PresentacionDTO> buscar(Long idProducto, String q, Boolean estadoActivo, Pageable pageable) {
        String pattern = (q == null || q.isBlank()) ? null : "%" + q.trim().toUpperCase() + "%";
        var page = presentacionRepo.buscar(idProducto, pattern, estadoActivo, pageable);
        return page.map(this::toDTO);
    }

    public PresentacionDTO obtener(Long id) {
        var p = presentacionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada: " + id));
        return toDTO(p);
    }

    @Transactional
    public PresentacionDTO crear(PresentacionCrearDTO dto) {
        // Validaciones mínimas (Bean Validation ya ayuda; reforzamos por claridad)
        if (dto.getCodigoSku() == null || dto.getCodigoSku().isBlank())
            throw new IllegalArgumentException("codigoSku es requerido");

        // Unicidad de SKU
        presentacionRepo.findByCodigoSku(dto.getCodigoSku().trim()).ifPresent(p -> {
            throw new IllegalArgumentException("El SKU ya existe: " + dto.getCodigoSku());
        });

        var p = PresentacionProducto.builder()
                .idProducto(dto.getIdProducto())
                .idUnidad(dto.getIdUnidad())
                .contenidoPorUnidad(dto.getContenidoPorUnidad())
                .codigoSku(dto.getCodigoSku().trim())
                .costoBaseUsd(dto.getCostoBaseUsd() != null ? dto.getCostoBaseUsd() : java.math.BigDecimal.ZERO)
                .margenVentaPorcentaje(dto.getMargenVentaPorcentaje() != null ? dto.getMargenVentaPorcentaje()
                        : java.math.BigDecimal.ZERO)
                .precioVentaBob(dto.getPrecioVentaBob() != null ? dto.getPrecioVentaBob() : java.math.BigDecimal.ZERO)
                .estadoActivo(true)
                .build();

        p = presentacionRepo.save(p);
        return toDTO(p);
    }

    @Transactional
    public PresentacionDTO actualizar(Long id, PresentacionActualizarDTO dto) {
        var p = presentacionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada: " + id));

        if (dto.getIdUnidad() != null)
            p.setIdUnidad(dto.getIdUnidad());
        if (dto.getContenidoPorUnidad() != null)
            p.setContenidoPorUnidad(dto.getContenidoPorUnidad());

        if (dto.getCodigoSku() != null) {
            var sku = dto.getCodigoSku().trim();
            presentacionRepo.findByCodigoSku(sku).ifPresent(existing -> {
                if (!existing.getIdPresentacion().equals(id)) {
                    throw new IllegalArgumentException("El SKU ya existe: " + sku);
                }
            });
            p.setCodigoSku(sku);
        }

        if (dto.getCostoBaseUsd() != null)
            p.setCostoBaseUsd(dto.getCostoBaseUsd());
        if (dto.getMargenVentaPorcentaje() != null)
            p.setMargenVentaPorcentaje(dto.getMargenVentaPorcentaje());
        if (dto.getPrecioVentaBob() != null)
            p.setPrecioVentaBob(dto.getPrecioVentaBob());
        if (dto.getEstadoActivo() != null)
            p.setEstadoActivo(dto.getEstadoActivo());

        p = presentacionRepo.save(p);
        return toDTO(p);
    }

    @Transactional
    public void desactivar(Long id) {
        var p = presentacionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada: " + id));
        p.setEstadoActivo(false);
        presentacionRepo.save(p);
    }

    // --- Códigos de barras ---

    public List<CodigoBarrasDTO> listarCodigos(Long idPresentacion) {
        return codigoRepo.findByIdPresentacion(idPresentacion).stream()
                .map(this::toCodigoDTO)
                .toList();
    }

    @Transactional
    public CodigoBarrasDTO agregarCodigo(Long idPresentacion, CodigoBarrasCrearDTO dto) {
        // podría validar duplicados: UNIQUE (id_presentacion, codigo_barras) ya lo hace
        // la BD
        var cb = CodigoBarras.builder()
                .idPresentacion(idPresentacion)
                .codigoBarras(dto.getCodigoBarras().trim())
                .descripcion(dto.getDescripcion())
                .build();
        cb = codigoRepo.save(cb);
        return toCodigoDTO(cb);
    }

    @Transactional
    public void eliminarCodigo(Long idPresentacion, Long idCodigoBarras) {
        var list = codigoRepo.findByIdPresentacion(idPresentacion);
        var match = list.stream().filter(x -> x.getIdCodigoBarras().equals(idCodigoBarras)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Código de barras no pertenece a la presentación"));
        codigoRepo.deleteById(match.getIdCodigoBarras());
    }

    // --- Mapeos ---
    private PresentacionDTO toDTO(PresentacionProducto p) {
        return PresentacionDTO.builder()
                .idPresentacion(p.getIdPresentacion())
                .idProducto(p.getIdProducto())
                .idUnidad(p.getIdUnidad())
                .contenidoPorUnidad(p.getContenidoPorUnidad())
                .codigoSku(p.getCodigoSku())
                .costoBaseUsd(p.getCostoBaseUsd())
                .margenVentaPorcentaje(p.getMargenVentaPorcentaje())
                .precioVentaBob(p.getPrecioVentaBob())
                .estadoActivo(p.getEstadoActivo())
                .imagenUrl(p.getImagenUrl())
                .build();
    }

    private CodigoBarrasDTO toCodigoDTO(CodigoBarras cb) {
        return CodigoBarrasDTO.builder()
                .idCodigoBarras(cb.getIdCodigoBarras())
                .idPresentacion(cb.getIdPresentacion())
                .codigoBarras(cb.getCodigoBarras())
                .descripcion(cb.getDescripcion())
                .build();
    }

    // ====== NUEVOS MÉTODOS IMAGEN ======
    @Transactional
    public PresentacionDTO subirImagen(Long idPresentacion, MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Archivo vacío");
        if (file.getContentType() == null || !file.getContentType().startsWith("image/"))
            throw new IllegalArgumentException("Solo se permiten imágenes");

        var p = presentacionRepo.findById(idPresentacion)
                .orElseThrow(() -> new EntityNotFoundException("Presentación no encontrada: " + idPresentacion));

        try {
            String url = storage.savePresentacionImage(idPresentacion, file);
            p.setImagenUrl(url);
            p = presentacionRepo.save(p);
            return toDTO(p);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo guardar la imagen", e);
        }
    }

    @Transactional
    public void eliminarImagen(Long idPresentacion) {
        var p = presentacionRepo.findById(idPresentacion)
                .orElseThrow(() -> new EntityNotFoundException("Presentación no encontrada: " + idPresentacion));
        try {
            storage.deletePresentacionImage(idPresentacion);
        } catch (Exception ignored) {
        }
        p.setImagenUrl(null);
        presentacionRepo.save(p);
    }
}
