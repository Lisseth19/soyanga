// com.soyanga.soyangabackend.servicio.precios.ReglasPreciosServicio.java
package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.dominio.PresentacionProducto;
import com.soyanga.soyangabackend.dto.precios.*;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.TipoDeCambioRepositorio;
import com.soyanga.soyangabackend.repositorio.precios.PrecioVentaHistoricoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReglasPreciosServicio {

    private final PresentacionProductoRepositorio presentacionRepo;
    private final PrecioVentaHistoricoRepositorio historicoRepo;
    private final TipoDeCambioRepositorio tcRepo;
    private final PoliticaRedondeo redondeo;

    @Transactional
    public ResumenRecalculoDTO recalcularMasivo(Long idMonedaOrigen, Long idMonedaDestino,
            boolean simular, String motivo) {

        var hoy = LocalDate.now();
        var tc = tcRepo.findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
                idMonedaOrigen, idMonedaDestino, hoy)
                .orElseThrow(() -> new IllegalArgumentException("No hay tipo de cambio vigente para el par"));

        var activas = presentacionRepo.findActivas();

        int cambiados = 0, iguales = 0, omitidos = 0;
        List<ItemCambioDTO> items = new ArrayList<>();

        for (PresentacionProducto p : activas) {
            if (p.getCostoBaseUsd() == null || p.getCostoBaseUsd().signum() <= 0) {
                omitidos++;
                continue;
            }
            BigDecimal margenFactor = BigDecimal.ONE.add(p.getMargenVentaPorcentaje().divide(new BigDecimal("100")));
            BigDecimal base = p.getCostoBaseUsd().multiply(tc.getTasaCambio()).multiply(margenFactor);
            BigDecimal nuevo = redondeo.aplicar(base);

            if (p.getPrecioVentaBob() != null && p.getPrecioVentaBob().compareTo(nuevo) == 0) {
                iguales++;
                continue; // idempotente
            }

            if (!simular) {
                var pLock = presentacionRepo.lockById(p.getIdPresentacion()).orElseThrow();

                historicoRepo
                        .findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(
                                p.getIdPresentacion())
                        .ifPresent(v -> {
                            v.setFechaFinVigencia(LocalDateTime.now().minusNanos(1));
                            historicoRepo.save(v);
                        });

                var hist = PrecioVentaHistorico.builder()
                        .idPresentacion(p.getIdPresentacion())
                        .precioVentaBob(nuevo)
                        .fechaInicioVigencia(LocalDateTime.now())
                        .motivoCambio(motivo != null ? motivo : "Re-cálculo por TC")
                        .build();
                historicoRepo.save(hist);

                pLock.setPrecioVentaBob(nuevo);
                presentacionRepo.save(pLock);
            }

            cambiados++;
            items.add(ItemCambioDTO.of(p.getIdPresentacion(), p.getCodigoSku(), p.getPrecioVentaBob(), nuevo));
        }

        return ResumenRecalculoDTO.builder()
                .cambiados(cambiados).iguales(iguales).omitidos(omitidos).items(items).build();
    }

    @Transactional
    public void cambioManual(Long idPresentacion, BigDecimal precioNuevo, String motivo, LocalDateTime inicio) {
        var p = presentacionRepo.lockById(idPresentacion).orElseThrow();

        // Si no quieres redondear en manual, usa 'precioNuevo' directo.
        BigDecimal valor = redondeo.aplicar(precioNuevo);

        if (p.getPrecioVentaBob() != null && p.getPrecioVentaBob().compareTo(valor) == 0)
            return;

        var inicioEf = inicio != null ? inicio : LocalDateTime.now();

        historicoRepo.findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(idPresentacion)
                .ifPresent(v -> {
                    if (inicioEf.isBefore(v.getFechaInicioVigencia())) {
                        throw new IllegalArgumentException(
                                "La fecha de inicio no puede ser anterior al vigente actual");
                    }
                    v.setFechaFinVigencia(inicioEf.minusNanos(1));
                    historicoRepo.save(v);
                });

        var hist = PrecioVentaHistorico.builder()
                .idPresentacion(idPresentacion)
                .precioVentaBob(valor)
                .fechaInicioVigencia(inicioEf)
                .motivoCambio(motivo != null ? motivo : "Ajuste manual")
                .build();
        historicoRepo.save(hist);

        p.setPrecioVentaBob(valor);
        presentacionRepo.save(p);
    }

    @Transactional
    public void revertir(Long idHistorico) {
        var hist = historicoRepo.findById(idHistorico)
                .orElseThrow(() -> new IllegalArgumentException("Histórico no encontrado"));

        var p = presentacionRepo.lockById(hist.getIdPresentacion()).orElseThrow();

        historicoRepo
                .findFirstByIdPresentacionAndFechaFinVigenciaIsNullOrderByFechaInicioVigenciaDesc(
                        hist.getIdPresentacion())
                .ifPresent(v -> {
                    v.setFechaFinVigencia(LocalDateTime.now().minusNanos(1));
                    historicoRepo.save(v);
                });

        var nuevo = PrecioVentaHistorico.builder()
                .idPresentacion(hist.getIdPresentacion())
                .precioVentaBob(hist.getPrecioVentaBob())
                .fechaInicioVigencia(LocalDateTime.now())
                .motivoCambio("Reversión a histórico " + idHistorico)
                .build();
        historicoRepo.save(nuevo);

        p.setPrecioVentaBob(hist.getPrecioVentaBob());
        presentacionRepo.save(p);
    }
}
