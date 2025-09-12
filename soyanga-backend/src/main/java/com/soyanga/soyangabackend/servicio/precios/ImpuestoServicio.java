package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dominio.Impuesto;
import com.soyanga.soyangabackend.dto.impuestos.*;
import com.soyanga.soyangabackend.repositorio.precios.ImpuestoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ImpuestoServicio {

    private final ImpuestoRepositorio repo;

    public Page<ImpuestoRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        var query = (q == null || q.isBlank()) ? null : q.trim();
        var page = repo.listar(query, soloActivos, pageable);
        return page.map(p -> ImpuestoRespuestaDTO.builder()
                .idImpuesto(p.getIdImpuesto())
                .nombreImpuesto(p.getNombreImpuesto())
                .porcentaje(p.getPorcentaje())
                .estadoActivo(p.getEstadoActivo())
                .build());
    }

    public ImpuestoRespuestaDTO obtener(Long id) {
        var i = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Impuesto no encontrado: " + id));
        return toDTO(i);
    }

    @Transactional
    public ImpuestoRespuestaDTO crear(ImpuestoCrearDTO dto) {
        if (repo.existsByNombreImpuestoIgnoreCase(dto.getNombreImpuesto())) {
            throw new IllegalArgumentException("Ya existe un impuesto con ese nombre");
        }
        var imp = Impuesto.builder()
                .nombreImpuesto(dto.getNombreImpuesto().trim())
                .porcentaje(dto.getPorcentaje())
                .estadoActivo(dto.getEstadoActivo() != null ? dto.getEstadoActivo() : true)
                .build();
        imp = repo.save(imp);
        return toDTO(imp);
    }

    @Transactional
    public ImpuestoRespuestaDTO editar(Long id, ImpuestoEditarDTO dto) {
        var imp = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Impuesto no encontrado: " + id));

        var nombreNuevo = dto.getNombreImpuesto().trim();
        if (!imp.getNombreImpuesto().equalsIgnoreCase(nombreNuevo)
                && repo.existsByNombreImpuestoIgnoreCase(nombreNuevo)) {
            throw new IllegalArgumentException("Ya existe un impuesto con ese nombre");
        }

        imp.setNombreImpuesto(nombreNuevo);
        imp.setPorcentaje(dto.getPorcentaje());
        if (dto.getEstadoActivo() != null) imp.setEstadoActivo(dto.getEstadoActivo());

        repo.save(imp);
        return toDTO(imp);
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Impuesto no encontrado: " + id);
        }
        repo.deleteById(id);
    }

    @Transactional
    public ImpuestoRespuestaDTO activar(Long id) {
        var imp = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Impuesto no encontrado: " + id));
        imp.setEstadoActivo(true);
        repo.save(imp);
        return toDTO(imp);
    }

    @Transactional
    public ImpuestoRespuestaDTO desactivar(Long id) {
        var imp = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Impuesto no encontrado: " + id));
        imp.setEstadoActivo(false);
        repo.save(imp);
        return toDTO(imp);
    }

    private ImpuestoRespuestaDTO toDTO(Impuesto i) {
        return ImpuestoRespuestaDTO.builder()
                .idImpuesto(i.getIdImpuesto())
                .nombreImpuesto(i.getNombreImpuesto())
                .porcentaje(i.getPorcentaje())
                .estadoActivo(i.getEstadoActivo())
                .build();
    }
}
