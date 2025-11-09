// com.soyanga.soyangabackend.servicio.precios.ReglasPreciosServicio.java
package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.dominio.PresentacionProducto;
import com.soyanga.soyangabackend.dto.precios.*;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.TipoDeCambioRepositorio;
import com.soyanga.soyangabackend.repositorio.precios.PrecioVentaHistoricoRepositorio;
import com.soyanga.soyangabackend.seguridad.AuthUtils;

import jakarta.annotation.Nullable;
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

        // com.soyanga.soyangabackend.servicio.precios.ReglasPreciosServicio

        @Transactional
        public ResumenRecalculoDTO recalcularMasivo(
                        Long idMonedaOrigen,
                        Long idMonedaDestino,
                        boolean simular,
                        String motivo,
                        @Nullable LocalDate fechaReferencia) {

                var fecha = (fechaReferencia != null) ? fechaReferencia : java.time.LocalDate.now();

                var tc = tcRepo
                                .findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
                                                idMonedaOrigen, idMonedaDestino, fecha)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "No hay tipo de cambio vigente para el par en la fecha " + fecha));

                var activas = presentacionRepo.findActivas();

                int cambiados = 0, iguales = 0, omitidos = 0;
                List<ItemCambioDTO> items = new ArrayList<>();

                // Inicio de aplicación: ahora (este flujo no programa a futuro)
                var inicio = LocalDateTime.now();

                for (PresentacionProducto p : activas) {
                        if (p.getCostoBaseUsd() == null || p.getCostoBaseUsd().signum() <= 0) {
                                omitidos++;
                                continue;
                        }

                        BigDecimal margenFactor = BigDecimal.ONE.add(
                                        p.getMargenVentaPorcentaje().divide(new BigDecimal("100")));

                        BigDecimal base = p.getCostoBaseUsd()
                                        .multiply(tc.getTasaCambio())
                                        .multiply(margenFactor);

                        BigDecimal nuevo = redondeo.aplicar(base);

                        if (p.getPrecioVentaBob() != null && p.getPrecioVentaBob().compareTo(nuevo) == 0) {
                                iguales++;
                                continue; // idempotente
                        }

                        if (!simular) {
                                var pLock = presentacionRepo.lockById(p.getIdPresentacion()).orElseThrow();

                                // ⬇️ cerrar vigente solo si realmente hay uno vigente HASTA AHORA (sin futuros)
                                historicoRepo.lockVigenteHastaAhora(p.getIdPresentacion(), inicio)
                                                .ifPresent(v -> {
                                                        v.setFechaFinVigencia(inicio); // cierre en el borde (no
                                                                                       // minusNanos)
                                                        historicoRepo.save(v);
                                                });

                                var hist = PrecioVentaHistorico.builder()
                                                .idPresentacion(p.getIdPresentacion())
                                                .precioVentaBob(nuevo)
                                                .fechaInicioVigencia(inicio)
                                                .motivoCambio(motivo != null ? motivo : "Re-cálculo por TC (UI)")
                                                .usuario(AuthUtils.currentUsername())
                                                .build();
                                historicoRepo.save(hist);

                                // ⬇️ como aplicamos “ahora”, sí reflejamos en la tabla de presentaciones
                                pLock.setPrecioVentaBob(nuevo);
                                presentacionRepo.save(pLock);
                        }

                        cambiados++;
                        items.add(ItemCambioDTO.of(
                                        p.getIdPresentacion(),
                                        p.getCodigoSku(),
                                        p.getPrecioVentaBob(),
                                        nuevo));
                }

                return ResumenRecalculoDTO.builder()
                                .cambiados(cambiados)
                                .iguales(iguales)
                                .omitidos(omitidos)
                                .items(items)
                                .build();
        }

        @Transactional
        public void cambioManual(Long idPresentacion, BigDecimal precioNuevo, String motivo, LocalDateTime inicio) {
                var p = presentacionRepo.lockById(idPresentacion).orElseThrow();

                BigDecimal valor = redondeo.aplicar(precioNuevo);
                if (p.getPrecioVentaBob() != null && p.getPrecioVentaBob().compareTo(valor) == 0)
                        return;

                var inicioEf = (inicio != null) ? inicio : LocalDateTime.now();
                // antes de lockVigenteHastaAhora(...)
                historicoRepo.deleteFuturosDesde(idPresentacion, inicioEf);

                // Cerrar vigente hasta ahora (sin tocar futuros)
                historicoRepo.lockVigenteHastaAhora(idPresentacion, inicioEf)
                                .ifPresent(v -> {
                                        if (inicioEf.isBefore(v.getFechaInicioVigencia())) {
                                                throw new IllegalArgumentException(
                                                                "La fecha de inicio no puede ser anterior al vigente actual");
                                        }
                                        v.setFechaFinVigencia(inicioEf); // borde exacto
                                        historicoRepo.save(v);
                                });

                var hist = PrecioVentaHistorico.builder()
                                .idPresentacion(idPresentacion)
                                .precioVentaBob(valor)
                                .fechaInicioVigencia(inicioEf)
                                .motivoCambio(motivo != null ? motivo : "Ajuste manual")
                                .usuario(AuthUtils.currentUsername())
                                .build();
                historicoRepo.save(hist);

                // Refleja en presentaciones solo si entra en vigor ya
                if (!inicioEf.isAfter(LocalDateTime.now())) {
                        p.setPrecioVentaBob(valor);
                        presentacionRepo.save(p);
                }
        }

        @Transactional
        public void revertir(Long idHistorico) {
                var hist = historicoRepo.findById(idHistorico)
                                .orElseThrow(() -> new IllegalArgumentException("Histórico no encontrado"));

                var p = presentacionRepo.lockById(hist.getIdPresentacion()).orElseThrow();

                var ahora = LocalDateTime.now();

                // Cierra el vigente de verdad (hasta ahora; evita futuros)
                historicoRepo.lockVigenteHastaAhora(hist.getIdPresentacion(), ahora)
                                .ifPresent(v -> {
                                        v.setFechaFinVigencia(ahora); // borde exacto
                                        historicoRepo.save(v);
                                });

                var nuevo = PrecioVentaHistorico.builder()
                                .idPresentacion(hist.getIdPresentacion())
                                .precioVentaBob(hist.getPrecioVentaBob())
                                .fechaInicioVigencia(ahora)
                                .motivoCambio("Reversión a histórico " + idHistorico)
                                .usuario(AuthUtils.currentUsername())
                                .build();
                historicoRepo.save(nuevo);

                // Refleja en presentaciones (entra en vigor ahora)
                p.setPrecioVentaBob(hist.getPrecioVentaBob());
                presentacionRepo.save(p);
        }

}
