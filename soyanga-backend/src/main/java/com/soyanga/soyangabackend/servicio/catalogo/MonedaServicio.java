package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Moneda;
import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.repositorio.catalogo.MonedaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MonedaServicio {

    private final MonedaRepositorio repo;

    public Page<MonedaRespuestaDTO> listar(String q, Pageable pageable) {
        // búsqueda simple por código o nombre usando Contains/ILIKE nativo si necesitas
        var page = repo.findAll(pageable); // simple; si quieres filtro por q, crea un query en el repo
        return page.map(this::toDTO);
    }

    public MonedaRespuestaDTO obtener(Long id) {
        var m = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Moneda no encontrada: " + id));
        return toDTO(m);
    }

    public MonedaRespuestaDTO crear(MonedaCrearDTO dto) {
        var m = Moneda.builder()
                .codigoMoneda(dto.getCodigoMoneda().trim())
                .nombreMoneda(dto.getNombreMoneda().trim())
                .esMonedaLocal(Boolean.TRUE.equals(dto.getEsMonedaLocal()))
                .build();
        m = repo.save(m);
        return toDTO(m);
    }

    public MonedaRespuestaDTO editar(Long id, MonedaEditarDTO dto) {
        var m = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Moneda no encontrada: " + id));
        if (dto.getNombreMoneda() != null) m.setNombreMoneda(dto.getNombreMoneda().trim());
        if (dto.getEsMonedaLocal() != null) m.setEsMonedaLocal(dto.getEsMonedaLocal());
        m = repo.save(m);
        return toDTO(m);
    }

    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    private MonedaRespuestaDTO toDTO(Moneda m) {
        return MonedaRespuestaDTO.builder()
                .idMoneda(m.getIdMoneda())
                .codigoMoneda(m.getCodigoMoneda())
                .nombreMoneda(m.getNombreMoneda())
                .esMonedaLocal(m.getEsMonedaLocal())
                .build();
    }
}
