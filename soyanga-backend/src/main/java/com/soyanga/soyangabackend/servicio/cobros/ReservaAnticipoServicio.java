package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.cobros.*;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReservaAnticipoServicio {

    private final AnticipoRepositorio anticipoRepo;
    private final AnticipoDetalleRepositorio anticipoDetRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;

    // ===================== CREAR ANTICIPO =====================
    @Transactional
    public Map<String,Object> crearAnticipo(AnticipoCrearDTO dto) {
        var anti = Anticipo.builder()
                .fechaAnticipo(LocalDateTime.now())
                .idCliente(dto.getIdCliente())
                .montoBob(dto.getMontoBob())
                .estadoAnticipo(Anticipo.EstadoAnticipo.registrado)
                .observaciones(dto.getObservaciones())
                .build();
        anti = anticipoRepo.save(anti);

        return Map.of(
                "idAnticipo", anti.getIdAnticipo(),
                "estado", anti.getEstadoAnticipo().name(),
                "fecha", anti.getFechaAnticipo(),
                "idCliente", anti.getIdCliente(),
                "montoBob", anti.getMontoBob()
        );
    }

    // ===================== RESERVAR =====================
    @Transactional
    public ReservaAnticipoRespuestaDTO reservar(Long idAnticipo, ReservaAnticipoDTO dto) {
        var anticipo = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));
        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new IllegalArgumentException("El anticipo está anulado");
        }

        var resultados = new ArrayList<ReservaAnticipoRespuestaDTO.Resultado>();

        for (var it : dto.getItems()) {
            var candidatos = existenciaRepo.fefoCandidatosPorPresentacion(it.getIdAlmacen(), it.getIdPresentacion());
            if (candidatos.isEmpty()) {
                throw new IllegalStateException("Sin stock en almacén para presentación " + it.getIdPresentacion());
            }

            BigDecimal restante = it.getCantidad();
            var lotesUsados = new ArrayList<ReservaAnticipoRespuestaDTO.Lote>();

            for (var cand : candidatos) {
                if (restante.signum() == 0) break;

                var ex = existenciaRepo.lockByAlmacenAndIdLote(it.getIdAlmacen(), cand.getIdLote())
                        .orElseThrow(() -> new IllegalStateException("Existencia no encontrada para lote " + cand.getIdLote()));

                BigDecimal puede = ex.getCantidadDisponible().min(restante);
                if (puede.signum() > 0) {
                    ex.setCantidadDisponible(ex.getCantidadDisponible().subtract(puede));
                    ex.setCantidadReservada(ex.getCantidadReservada().add(puede));
                    ex.setFechaUltimaActualizacion(LocalDateTime.now());
                    existenciaRepo.save(ex);

                    // Kárdex: reserva_anticipo (cantidad positiva)
                    movRepo.save(MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.reserva_anticipo)
                            .idAlmacenOrigen(it.getIdAlmacen())
                            .idAlmacenDestino(null)
                            .idLote(ex.getIdLote())
                            .cantidad(puede)
                            .referenciaModulo("anticipo")
                            .idReferencia(idAnticipo)
                            .observaciones("Reserva anticipo")
                            .build());

                    lotesUsados.add(ReservaAnticipoRespuestaDTO.Lote.builder()
                            .idLote(ex.getIdLote())
                            .cantidad(puede)
                            .build());

                    restante = restante.subtract(puede);
                }
            }

            if (restante.signum() > 0) {
                throw new IllegalStateException("Stock insuficiente para reservar presentación " + it.getIdPresentacion());
            }

            // upsert agregado en anticipos_detalle
            var det = anticipoDetRepo.findByIdAnticipoAndIdPresentacion(idAnticipo, it.getIdPresentacion())
                    .orElseGet(() -> AnticipoDetalle.builder()
                            .idAnticipo(idAnticipo)
                            .idPresentacion(it.getIdPresentacion())
                            .cantidadReservada(BigDecimal.ZERO)
                            .build());
            det.setCantidadReservada(det.getCantidadReservada().add(it.getCantidad()));
            anticipoDetRepo.save(det);

            resultados.add(ReservaAnticipoRespuestaDTO.Resultado.builder()
                    .idPresentacion(it.getIdPresentacion())
                    .idAlmacen(it.getIdAlmacen())
                    .cantidadProcesada(it.getCantidad())
                    .lotes(lotesUsados)
                    .build());
        }

        return ReservaAnticipoRespuestaDTO.builder()
                .idAnticipo(idAnticipo)
                .operacion("reservar")
                .itemsProcesados(resultados.size())
                .resultados(resultados)
                .build();
    }

    // ===================== LIBERAR PARCIAL =====================
    @Transactional
    public ReservaAnticipoRespuestaDTO liberar(Long idAnticipo, LiberarReservaAnticipoDTO dto) {
        var anticipo = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));
        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new IllegalArgumentException("El anticipo está anulado");
        }

        var resultados = new ArrayList<ReservaAnticipoRespuestaDTO.Resultado>();

        for (var it : dto.getItems()) {
            var det = anticipoDetRepo.findByIdAnticipoAndIdPresentacion(idAnticipo, it.getIdPresentacion())
                    .orElseThrow(() -> new IllegalArgumentException("El anticipo no tiene reserva para esa presentación"));

            if (det.getCantidadReservada().compareTo(it.getCantidad()) < 0) {
                throw new IllegalArgumentException("Reserva insuficiente para liberar. Reservado: " + det.getCantidadReservada());
            }

            BigDecimal restante = it.getCantidad();
            var lotesLiberados = new ArrayList<ReservaAnticipoRespuestaDTO.Lote>();

            var candidatos = existenciaRepo.fefoCandidatosPorPresentacion(it.getIdAlmacen(), it.getIdPresentacion());
            for (var cand : candidatos) {
                if (restante.signum() == 0) break;

                var ex = existenciaRepo.lockByAlmacenAndIdLote(it.getIdAlmacen(), cand.getIdLote())
                        .orElseThrow(() -> new IllegalStateException("Existencia no encontrada para lote " + cand.getIdLote()));

                BigDecimal puede = ex.getCantidadReservada().min(restante);
                if (puede.signum() > 0) {
                    ex.setCantidadReservada(ex.getCantidadReservada().subtract(puede));
                    ex.setCantidadDisponible(ex.getCantidadDisponible().add(puede));
                    ex.setFechaUltimaActualizacion(LocalDateTime.now());
                    existenciaRepo.save(ex);

                    movRepo.save(MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.liberacion_reserva)
                            .idAlmacenOrigen(it.getIdAlmacen())
                            .idAlmacenDestino(null)
                            .idLote(ex.getIdLote())
                            .cantidad(puede)
                            .referenciaModulo("anticipo")
                            .idReferencia(idAnticipo)
                            .observaciones("Liberación de reserva anticipo")
                            .build());

                    lotesLiberados.add(ReservaAnticipoRespuestaDTO.Lote.builder()
                            .idLote(ex.getIdLote())
                            .cantidad(puede)
                            .build());

                    restante = restante.subtract(puede);
                }
            }

            if (restante.signum() > 0) {
                throw new IllegalStateException("No se pudo liberar la cantidad solicitada (reservas insuficientes en lotes)");
            }

            det.setCantidadReservada(det.getCantidadReservada().subtract(it.getCantidad()));
            anticipoDetRepo.save(det);

            resultados.add(ReservaAnticipoRespuestaDTO.Resultado.builder()
                    .idPresentacion(it.getIdPresentacion())
                    .idAlmacen(it.getIdAlmacen())
                    .cantidadProcesada(it.getCantidad())
                    .lotes(lotesLiberados)
                    .build());
        }

        return ReservaAnticipoRespuestaDTO.builder()
                .idAnticipo(idAnticipo)
                .operacion("liberar")
                .itemsProcesados(resultados.size())
                .resultados(resultados)
                .build();
    }

    // ===================== LIBERAR TODO =====================
    @Transactional
    public Map<String,Object> liberarTodo(Long idAnticipo) {
        var anti = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));

        // Tomamos los movimientos de reserva asociados al anticipo
        var reservas = movRepo.reservasDeAnticipo(idAnticipo);

        int lotesProcesados = 0;
        BigDecimal totalLiberado = BigDecimal.ZERO;

        for (var r : reservas) {
            Long almacen = r.getIdAlmacenOrigen(); // así lo guardamos al reservar
            Long lote = r.getIdLote();
            BigDecimal qtyReservaRegistrada = r.getCantidad(); // positiva

            var exOpt = existenciaRepo.lockByAlmacenAndIdLote(almacen, lote);
            if (exOpt.isEmpty()) {
                // No hay existencia para ese almacén/lote (quizá se movió); continúa sin fallar
                continue;
            }
            var ex = exOpt.get();

            // Libera solo lo que efectivamente siga reservado
            BigDecimal liberar = ex.getCantidadReservada().min(qtyReservaRegistrada);
            if (liberar.signum() <= 0) {
                continue; // nada que liberar aquí
            }

            ex.setCantidadReservada(ex.getCantidadReservada().subtract(liberar));
            ex.setCantidadDisponible(ex.getCantidadDisponible().add(liberar));
            ex.setFechaUltimaActualizacion(LocalDateTime.now());
            existenciaRepo.save(ex);

            // Kárdex: liberación (cantidad positiva = regresa a disponible)
            movRepo.save(MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.liberacion_reserva)
                    .idAlmacenOrigen(null)
                    .idAlmacenDestino(almacen)
                    .idLote(lote)
                    .cantidad(liberar)
                    .referenciaModulo("anticipo")
                    .idReferencia(idAnticipo)
                    .observaciones("Liberación total de anticipo " + idAnticipo)
                    .build());

            lotesProcesados++;
            totalLiberado = totalLiberado.add(liberar);
        }

        // Limpia agregados del anticipo (resumen por presentación)
        var dets = anticipoDetRepo.findByIdAnticipo(idAnticipo);
        if (!dets.isEmpty()) {
            anticipoDetRepo.deleteAll(dets);
        }

        // Deja el anticipo en "registrado" (vigente, sin reservas)
        anti.setEstadoAnticipo(Anticipo.EstadoAnticipo.registrado);
        anticipoRepo.save(anti);

        return Map.of(
                "idAnticipo", idAnticipo,
                "lotesProcesados", lotesProcesados,
                "totalLiberado", totalLiberado
        );
    }
}
