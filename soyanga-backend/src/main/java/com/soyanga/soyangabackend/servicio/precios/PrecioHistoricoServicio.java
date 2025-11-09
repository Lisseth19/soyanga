package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.dto.precios.PrecioHistoricoDTO;
import com.soyanga.soyangabackend.dto.precios.PrecioNuevoDTO;
import com.soyanga.soyangabackend.repositorio.precios.PrecioVentaHistoricoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.soyanga.soyangabackend.seguridad.AuthUtils;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PrecioHistoricoServicio {

    private final PrecioVentaHistoricoRepositorio precioRepo;
    private final PoliticaRedondeo redondeo;

    public Page<PrecioHistoricoDTO> listar(Long idPresentacion, Pageable pageable) {
        var page = precioRepo.findByIdPresentacionOrderByFechaInicioVigenciaDesc(idPresentacion, pageable);
        return page.map(this::toDTO);
    }

    public PrecioHistoricoDTO vigente(Long idPresentacion) {
        var opt = precioRepo
                .findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(idPresentacion);
        return opt.map(this::toDTO).orElse(null);
    }

    @Transactional
    public PrecioHistoricoDTO crearNuevo(Long idPresentacion, PrecioNuevoDTO dto) {
        // 1) Fecha/hora de aplicación
        LocalDateTime inicio = dto.getFechaInicioVigencia() != null
                ? dto.getFechaInicioVigencia()
                : LocalDateTime.now();

        // 2) Redondeo consistente
        var precioRedondeado = redondeo.aplicar(dto.getPrecioVentaBob());

        // 3) Quitar solapes futuros (si existía algo programado >= inicio)
        precioRepo.deleteFuturosDesde(idPresentacion, inicio);

        // 4) Recortar el vigente EN la fecha de aplicación, si lo hubiera
        var vigenteEnInicio = precioRepo.findVigenteEn(idPresentacion, inicio);
        vigenteEnInicio.ifPresent(v -> {
            // Si el vigente comienza antes/igual a 'inicio', lo cerramos 1ns antes
            if (!inicio.isBefore(v.getFechaInicioVigencia())) {
                v.setFechaFinVigencia(inicio);
                precioRepo.save(v);
            } else {
                // Caso raro: había un registro que "se considera vigente" pero con inicio
                // posterior.
                // Ya lo eliminamos en el paso 3 si era futuro; aquí no hay nada más que hacer.
            }
        });

        // 5) Crear el nuevo histórico desde 'inicio'
        var nuevo = PrecioVentaHistorico.builder()
                .idPresentacion(idPresentacion)
                .precioVentaBob(precioRedondeado)
                .fechaInicioVigencia(inicio)
                .fechaFinVigencia(null)
                .motivoCambio(dto.getMotivoCambio())
                .usuario(AuthUtils.currentUsername())
                .build();

        nuevo = precioRepo.save(nuevo);

        return toDTO(nuevo);
    }

    // --- Mapeo ---
    private PrecioHistoricoDTO toDTO(PrecioVentaHistorico p) {
        var ahora = java.time.LocalDateTime.now();
        boolean vigenteHoy = p.getFechaFinVigencia() == null
                && !p.getFechaInicioVigencia().isAfter(ahora); // inicio <= ahora

        return PrecioHistoricoDTO.builder()
                .idPrecioHistorico(p.getIdPrecioHistorico())
                .idPresentacion(p.getIdPresentacion())
                .precioVentaBob(p.getPrecioVentaBob())
                .fechaInicioVigencia(p.getFechaInicioVigencia())
                .fechaFinVigencia(p.getFechaFinVigencia())
                .motivoCambio(p.getMotivoCambio())
                .vigente(vigenteHoy)
                .build();
    }
}
