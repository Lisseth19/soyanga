package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.dto.precios.PrecioHistoricoDTO;
import com.soyanga.soyangabackend.dto.precios.PrecioNuevoDTO;
import com.soyanga.soyangabackend.repositorio.precios.PrecioVentaHistoricoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PrecioHistoricoServicio {

    private final PrecioVentaHistoricoRepositorio precioRepo;

    public Page<PrecioHistoricoDTO> listar(Long idPresentacion, Pageable pageable) {
        var page = precioRepo.findByIdPresentacionOrderByFechaInicioVigenciaDesc(idPresentacion, pageable);
        return page.map(this::toDTO);
    }

    public PrecioHistoricoDTO vigente(Long idPresentacion) {
        var opt = precioRepo.findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(idPresentacion);
        return opt.map(this::toDTO).orElse(null);
    }

    @Transactional
    public PrecioHistoricoDTO crearNuevo(Long idPresentacion, PrecioNuevoDTO dto) {
        LocalDateTime inicio = dto.getFechaInicioVigencia() != null ? dto.getFechaInicioVigencia() : LocalDateTime.now();

        // Cerrar vigente si existe
        var vigenteOpt = precioRepo.findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(idPresentacion);
        if (vigenteOpt.isPresent()) {
            var vigente = vigenteOpt.get();
            if (inicio.isBefore(vigente.getFechaInicioVigencia())) {
                throw new IllegalArgumentException("La fecha de inicio del nuevo precio no puede ser anterior al vigente actual");
            }
            // Cerramos el vigente justo antes del nuevo
            vigente.setFechaFinVigencia(inicio.minusSeconds(1));
            precioRepo.save(vigente);
        }

        // Crear nuevo precio
        var nuevo = PrecioVentaHistorico.builder()
                .idPresentacion(idPresentacion)
                .precioVentaBob(dto.getPrecioVentaBob())
                .fechaInicioVigencia(inicio)
                .fechaFinVigencia(null)
                .motivoCambio(dto.getMotivoCambio())
                .build();

        nuevo = precioRepo.save(nuevo);
        return toDTO(nuevo);
    }

    // --- Mapeo ---
    private PrecioHistoricoDTO toDTO(PrecioVentaHistorico p) {
        return PrecioHistoricoDTO.builder()
                .idPrecioHistorico(p.getIdPrecioHistorico())
                .idPresentacion(p.getIdPresentacion())
                .precioVentaBob(p.getPrecioVentaBob())
                .fechaInicioVigencia(p.getFechaInicioVigencia())
                .fechaFinVigencia(p.getFechaFinVigencia())
                .motivoCambio(p.getMotivoCambio())
                .vigente(p.getFechaFinVigencia() == null)
                .build();
    }
}
