package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.UnidadMedida;
import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.repositorio.catalogo.UnidadMedidaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UnidadServicio {

    private final UnidadMedidaRepositorio repo;

    public Page<UnidadDTO> buscar(String q, Pageable pageable) {
        return repo.buscar((q == null || q.isBlank()) ? null : q.trim(), pageable)
                .map(this::toDTO);
    }

    public UnidadDTO obtener(Long id) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Unidad no encontrada"));
        return toDTO(u);
    }

    @Transactional
    public UnidadDTO crear(UnidadCrearDTO dto) {
        var u = UnidadMedida.builder()
                .nombreUnidad(dto.getNombreUnidad().trim())
                .simboloUnidad(dto.getSimboloUnidad().trim())
                .factorConversionBase(dto.getFactorConversionBase() != null ? dto.getFactorConversionBase() : java.math.BigDecimal.ONE)
                .build();
        return toDTO(repo.save(u));
    }

    @Transactional
    public UnidadDTO actualizar(Long id, UnidadActualizarDTO dto) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Unidad no encontrada"));
        if (dto.getNombreUnidad() != null) u.setNombreUnidad(dto.getNombreUnidad().trim());
        if (dto.getSimboloUnidad() != null) u.setSimboloUnidad(dto.getSimboloUnidad().trim());
        if (dto.getFactorConversionBase() != null) u.setFactorConversionBase(dto.getFactorConversionBase());
        return toDTO(repo.save(u));
    }

    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    private UnidadDTO toDTO(UnidadMedida u) {
        return UnidadDTO.builder()
                .idUnidad(u.getIdUnidad())
                .nombreUnidad(u.getNombreUnidad())
                .simboloUnidad(u.getSimboloUnidad())
                .factorConversionBase(u.getFactorConversionBase())
                .build();
    }
}
