package com.soyanga.soyangabackend.servicio.finanzas;

import com.soyanga.soyangabackend.dominio.TipoDeCambio;
import com.soyanga.soyangabackend.dto.catalogo.ConversionDTO;
import com.soyanga.soyangabackend.dto.finanzas.*;
import com.soyanga.soyangabackend.repositorio.catalogo.TipoDeCambioRepositorio;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class TipoCambioServicio {

    private final TipoDeCambioRepositorio repo;

    public TipoCambioRespuestaDTO vigente(Long idOrigen, Long idDestino, LocalDate fecha) {
        var f = (fecha != null) ? fecha : LocalDate.now();
        var opt = repo.findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
                idOrigen, idDestino, f);
        return opt.map(this::toDTO).orElse(null);
    }

    public TipoCambioRespuestaDTO crear(TipoCambioCrearDTO dto) {
        if (dto.getIdMonedaOrigen().equals(dto.getIdMonedaDestino())) {
            throw new IllegalArgumentException("La moneda de origen y destino no pueden ser iguales");
        }
        // Si tu DTO ya tiene @DecimalMin(">0"), perfecto. Si no:
        if (dto.getTasaCambio() == null || dto.getTasaCambio().signum() <= 0) {
            throw new IllegalArgumentException("La tasa de cambio debe ser > 0");
        }

        var t = TipoDeCambio.builder()
                .idMonedaOrigen(dto.getIdMonedaOrigen())
                .idMonedaDestino(dto.getIdMonedaDestino())
                .fechaVigencia(dto.getFechaVigencia())
                .tasaCambio(dto.getTasaCambio())
                .build();
        t = repo.save(t);
        return toDTO(t);
    }

    // Historial por par (si ambos vienen); si no, listar todo por fecha desc
    public Page<TipoCambioRespuestaDTO> historial(Long idOrigen, Long idDestino, Pageable pageable) {
        Page<TipoDeCambio> page;
        if (idOrigen != null && idDestino != null) {
            page = repo.findByIdMonedaOrigenAndIdMonedaDestinoOrderByFechaVigenciaDesc(idOrigen, idDestino, pageable);
        } else {
            page = repo.findAllByOrderByFechaVigenciaDesc(pageable);
        }
        return page.map(this::toDTO);
    }

    // NUEVO: conversión usando vigente de hoy
    public ConversionDTO convertir(Long idOrigen, Long idDestino, java.math.BigDecimal monto) {
        var hoy = LocalDate.now();
        var tOpt = repo.findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
                idOrigen, idDestino, hoy);
        var t = tOpt.orElseThrow(() -> new IllegalArgumentException("No hay tipo de cambio vigente para ese par"));
        var destino = monto.multiply(t.getTasaCambio());

        return ConversionDTO.builder()
                .idMonedaOrigen(idOrigen)
                .idMonedaDestino(idDestino)
                .montoOrigen(monto)
                .tasaUsada(t.getTasaCambio())
                .montoDestino(destino)
                .build();
    }

    private TipoCambioRespuestaDTO toDTO(TipoDeCambio t) {
        boolean vigente = !t.getFechaVigencia().isAfter(LocalDate.now());
        return TipoCambioRespuestaDTO.builder()
                .idTipoCambio(t.getIdTipoCambio())
                .idMonedaOrigen(t.getIdMonedaOrigen())
                .idMonedaDestino(t.getIdMonedaDestino())
                .fechaVigencia(t.getFechaVigencia())
                .tasaCambio(t.getTasaCambio())
                .vigente(vigente)
                .build();
    }

    @Transactional
    public TipoDeCambio crearSiNoExiste(Long idOrigen, Long idDestino, LocalDate fecha, BigDecimal tasa) {
        return repo.findByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigencia(idOrigen, idDestino, fecha)
                .orElseGet(() -> {
                    var tc = new TipoDeCambio();
                    tc.setIdMonedaOrigen(idOrigen);
                    tc.setIdMonedaDestino(idDestino);
                    tc.setFechaVigencia(fecha);
                    tc.setTasaCambio(tasa);
                    return repo.save(tc);
                });
    }
}