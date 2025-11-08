package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.dto.cobros.*;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
    public Map<String, Object> crearAnticipo(AnticipoCrearDTO dto) {
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

    // ===================== RESERVAR (legacy firma) =====================
    @Transactional
    public ReservaAnticipoRespuestaDTO reservar(Long idAnticipo, ReservaAnticipoDTO dto) {
        // Comportamiento previo: NO permite sin stock
        return reservar(idAnticipo, dto, false);
    }

    // ===================== RESERVAR (permite pedir > stock) =====================
    @Transactional
    public ReservaAnticipoRespuestaDTO reservar(Long idAnticipo, ReservaAnticipoDTO dto, boolean permitirSinStock) {
        var anticipo = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));

        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new IllegalArgumentException("El anticipo está anulado");
        }

        var resp = new ReservaAnticipoRespuestaDTO();
        resp.setIdAnticipo(idAnticipo);
        resp.setOperacion("reservar");

        List<ReservaAnticipoRespuestaDTO.ResultadoItem> resultados = new ArrayList<>();
        int itemsProcesados = 0;

        try {
            for (var it : dto.getItems()) {
                final Long idAlmacen = it.getIdAlmacen();
                final Long idPresentacion = it.getIdPresentacion();
                BigDecimal qtySolicitada = nz(it.getCantidad());
                if (qtySolicitada.signum() <= 0) continue;

                // 1) FEFO: candidatos por almacén/presentación
                var candidatos = existenciaRepo.fefoCandidatosPorPresentacion(idAlmacen, idPresentacion);

                BigDecimal restante = qtySolicitada;
                BigDecimal totalReservado = BigDecimal.ZERO;
                List<ReservaAnticipoRespuestaDTO.LotePick> lotesUsados = new ArrayList<>();

                for (var cand : candidatos) {
                    if (restante.signum() == 0) break;

                    var exOpt = existenciaRepo.lockByAlmacenAndIdLote(idAlmacen, cand.getIdLote());
                    if (exOpt.isEmpty()) continue;
                    var ex = exOpt.get();

                    BigDecimal disponible = nz(ex.getCantidadDisponible());
                    BigDecimal puede = min(disponible, restante);
                    if (puede.signum() > 0) {
                        // disponible -> reservada
                        ex.setCantidadDisponible(disponible.subtract(puede));
                        ex.setCantidadReservada(nz(ex.getCantidadReservada()).add(puede));
                        ex.setFechaUltimaActualizacion(LocalDateTime.now());
                        existenciaRepo.save(ex);

                        // Kárdex
                        movRepo.save(com.soyanga.soyangabackend.dominio.MovimientoInventario.builder()
                                .fechaMovimiento(LocalDateTime.now())
                                .tipoMovimiento(com.soyanga.soyangabackend.dominio.MovimientoInventario.TipoMovimiento.reserva_anticipo)
                                .idAlmacenOrigen(idAlmacen)
                                .idAlmacenDestino(null)
                                .idLote(ex.getIdLote())
                                .cantidad(puede)
                                .referenciaModulo("anticipo")
                                .idReferencia(idAnticipo)
                                .observaciones("Reserva anticipo")
                                .build());

                        var lp = new ReservaAnticipoRespuestaDTO.LotePick();
                        lp.setIdLote(ex.getIdLote());
                        lp.setCantidad(puede);
                        lotesUsados.add(lp);

                        totalReservado = totalReservado.add(puede);
                        restante = restante.subtract(puede);
                    }
                }

                // 2) Si falta y NO se permite sin stock => error
                if (restante.signum() > 0 && !permitirSinStock) {
                    throw new IllegalArgumentException(
                            "No hay stock suficiente para reservar. Faltante: " + restante + " (presentación " + idPresentacion + ")"
                    );
                }

                // 3) UPSERT en anticipos_detalle: solicitada += qtySolicitada; reservada += totalReservado
                var det = anticipoDetRepo
                        .findByIdAnticipoAndIdPresentacionAndIdAlmacen(idAnticipo, idPresentacion, idAlmacen)
                        .orElseGet(() -> com.soyanga.soyangabackend.dominio.AnticipoDetalle.builder()
                                .idAnticipo(idAnticipo)
                                .idPresentacion(idPresentacion)
                                .idAlmacen(idAlmacen)
                                .cantidadSolicitada(BigDecimal.ZERO)
                                .cantidadReservada(BigDecimal.ZERO)
                                .build());

                det.setCantidadSolicitada(nz(det.getCantidadSolicitada()).add(qtySolicitada));
                det.setCantidadReservada(nz(det.getCantidadReservada()).add(totalReservado));
                anticipoDetRepo.save(det);

                // 4) Si hay faltante y se permite sin stock -> reflejarlo en la respuesta como “SIN_LOTE”
                if (restante.signum() > 0 && permitirSinStock) {
                    var lpVirtual = new ReservaAnticipoRespuestaDTO.LotePick();
                    lpVirtual.setIdLote(0L); // convención: 0 = SIN LOTE
                    lpVirtual.setNumeroLote("SIN_LOTE");
                    lpVirtual.setCantidad(restante);
                    lotesUsados.add(lpVirtual);
                }

                var r = new ReservaAnticipoRespuestaDTO.ResultadoItem();
                r.setIdPresentacion(idPresentacion);
                r.setIdAlmacen(idAlmacen);
                // cantidadProcesada = lo efectivamente reservado (mantiene compatibilidad)
                r.setCantidadProcesada(totalReservado);
                r.setLotes(lotesUsados);
                resultados.add(r);

                itemsProcesados++;
            }

            resp.setItemsProcesados(itemsProcesados);
            resp.setResultados(resultados);
            return resp;

        } catch (DataIntegrityViolationException e) {
            // Traducimos a mensaje claro (400 en tu manejador global)
            throw new IllegalArgumentException("Violación de integridad de datos", e);
        }
    }

    // ===================== LIBERAR PARCIAL =====================
    @Transactional
    public ReservaAnticipoRespuestaDTO liberar(Long idAnticipo, LiberarReservaAnticipoDTO dto) {
        var anticipo = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));
        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new IllegalArgumentException("El anticipo está anulado");
        }

        List<ReservaAnticipoRespuestaDTO.ResultadoItem> resultados = new ArrayList<>();

        for (var it : dto.getItems()) {
            final Long idAlmacen = it.getIdAlmacen();
            final Long idPresentacion = it.getIdPresentacion();
            BigDecimal qtyLiberar = nz(it.getCantidad());
            if (qtyLiberar.signum() <= 0) continue;

            var det = anticipoDetRepo
                    .findByIdAnticipoAndIdPresentacionAndIdAlmacen(idAnticipo, idPresentacion, idAlmacen)
                    .orElseThrow(() -> new IllegalArgumentException("El anticipo no tiene detalle para esa presentación/almacén"));

            if (nz(det.getCantidadReservada()).compareTo(qtyLiberar) < 0) {
                throw new IllegalArgumentException("Reserva insuficiente para liberar. Reservado: " + det.getCantidadReservada());
            }

            BigDecimal restante = qtyLiberar;
            List<ReservaAnticipoRespuestaDTO.LotePick> lotesLiberados = new ArrayList<>();

            var candidatos = existenciaRepo.fefoCandidatosPorPresentacion(idAlmacen, idPresentacion);
            for (var cand : candidatos) {
                if (restante.signum() == 0) break;

                var exOpt = existenciaRepo.lockByAlmacenAndIdLote(idAlmacen, cand.getIdLote());
                if (exOpt.isEmpty()) continue;
                var ex = exOpt.get();

                BigDecimal puede = nz(ex.getCantidadReservada()).min(restante);
                if (puede.signum() > 0) {
                    ex.setCantidadReservada(nz(ex.getCantidadReservada()).subtract(puede));
                    ex.setCantidadDisponible(nz(ex.getCantidadDisponible()).add(puede));
                    ex.setFechaUltimaActualizacion(LocalDateTime.now());
                    existenciaRepo.save(ex);

                    movRepo.save(com.soyanga.soyangabackend.dominio.MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(com.soyanga.soyangabackend.dominio.MovimientoInventario.TipoMovimiento.liberacion_reserva)
                            .idAlmacenOrigen(idAlmacen)
                            .idAlmacenDestino(null)
                            .idLote(ex.getIdLote())
                            .cantidad(puede)
                            .referenciaModulo("anticipo")
                            .idReferencia(idAnticipo)
                            .observaciones("Liberación de reserva anticipo")
                            .build());

                    var lp = new ReservaAnticipoRespuestaDTO.LotePick();
                    lp.setIdLote(ex.getIdLote());
                    lp.setCantidad(puede);
                    lotesLiberados.add(lp);

                    restante = restante.subtract(puede);
                }
            }

            if (restante.signum() > 0) {
                throw new IllegalStateException("No se pudo liberar la cantidad solicitada en lotes disponibles.");
            }

            det.setCantidadReservada(nz(det.getCantidadReservada()).subtract(qtyLiberar));
            anticipoDetRepo.save(det);

            var r = new ReservaAnticipoRespuestaDTO.ResultadoItem();
            r.setIdPresentacion(idPresentacion);
            r.setIdAlmacen(idAlmacen);
            r.setCantidadProcesada(qtyLiberar);
            r.setLotes(lotesLiberados);
            resultados.add(r);
        }

        var resp = new ReservaAnticipoRespuestaDTO();
        resp.setIdAnticipo(idAnticipo);
        resp.setOperacion("liberar");
        resp.setItemsProcesados(resultados.size());
        resp.setResultados(resultados);
        return resp;
    }

    // ===================== LIBERAR TODO =====================
    @Transactional
    public Map<String, Object> liberarTodo(Long idAnticipo) {
        var anti = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));

        var reservas = movRepo.reservasDeAnticipo(idAnticipo);
        int lotesProcesados = 0;
        BigDecimal totalLiberado = BigDecimal.ZERO;

        for (var r : reservas) {
            Long almacen = r.getIdAlmacenOrigen();
            Long lote = r.getIdLote();
            BigDecimal qtyReservaRegistrada = r.getCantidad();

            var exOpt = existenciaRepo.lockByAlmacenAndIdLote(almacen, lote);
            if (exOpt.isEmpty()) continue;
            var ex = exOpt.get();

            BigDecimal liberar = nz(ex.getCantidadReservada()).min(qtyReservaRegistrada);
            if (liberar.signum() <= 0) continue;

            ex.setCantidadReservada(nz(ex.getCantidadReservada()).subtract(liberar));
            ex.setCantidadDisponible(nz(ex.getCantidadDisponible()).add(liberar));
            ex.setFechaUltimaActualizacion(LocalDateTime.now());
            existenciaRepo.save(ex);

            movRepo.save(com.soyanga.soyangabackend.dominio.MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(com.soyanga.soyangabackend.dominio.MovimientoInventario.TipoMovimiento.liberacion_reserva)
                    .idAlmacenOrigen(almacen)
                    .idAlmacenDestino(null)
                    .idLote(lote)
                    .cantidad(liberar)
                    .referenciaModulo("anticipo")
                    .idReferencia(idAnticipo)
                    .observaciones("Liberación total de anticipo " + idAnticipo)
                    .build());

            lotesProcesados++;
            totalLiberado = totalLiberado.add(liberar);
        }

        // Resetear reservada=0, mantener solicitada
        var dets = anticipoDetRepo.findByIdAnticipo(idAnticipo);
        for (var det : dets) det.setCantidadReservada(BigDecimal.ZERO);
        if (!dets.isEmpty()) anticipoDetRepo.saveAll(dets);

        anti.setEstadoAnticipo(Anticipo.EstadoAnticipo.registrado);
        anticipoRepo.save(anti);

        return Map.of(
                "idAnticipo", idAnticipo,
                "lotesProcesados", lotesProcesados,
                "totalLiberado", totalLiberado
        );
    }

    // ===================== CONSULTAS =====================
    @Transactional(readOnly = true)
    public ReservaAnticipoRespuestaDTO reservasVigentes(Long idAnticipo) {
        anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));

        List<MovimientoInventarioRepositorio.ReservaVigenteRowMin> rows =
                movRepo.reservasVigentesMin(idAnticipo);

        var resp = new ReservaAnticipoRespuestaDTO();
        resp.setIdAnticipo(idAnticipo);
        resp.setOperacion("consulta");

        if (rows == null || rows.isEmpty()) {
            resp.setItemsProcesados(0);
            resp.setResultados(Collections.emptyList());
            return resp;
        }

        class Group {
            Long idAlmacen;
            Long idPresentacion;
            BigDecimal total = BigDecimal.ZERO;
            List<ReservaAnticipoRespuestaDTO.LotePick> lotes = new ArrayList<>();
        }

        Map<String, Group> map = new LinkedHashMap<>();

        for (var r : rows) {
            Long idAlm  = r.getIdAlmacen();
            Long idPres = r.getIdPresentacion();
            Long idLote = r.getIdLote();
            BigDecimal cant = nz(r.getCantidad());
            if (cant.signum() <= 0) continue;

            String key = (idAlm == null ? "null" : idAlm.toString()) + "|" +
                    (idPres == null ? "null" : idPres.toString());

            var g = map.computeIfAbsent(key, __ -> {
                Group ng = new Group();
                ng.idAlmacen = idAlm;
                ng.idPresentacion = idPres;
                return ng;
            });

            g.total = g.total.add(cant);
            var lp = new ReservaAnticipoRespuestaDTO.LotePick();
            lp.setIdLote(idLote);
            lp.setCantidad(cant);
            g.lotes.add(lp);
        }

        List<ReservaAnticipoRespuestaDTO.ResultadoItem> resultados = new ArrayList<>();
        for (var g : map.values()) {
            var ri = new ReservaAnticipoRespuestaDTO.ResultadoItem();
            ri.setIdPresentacion(g.idPresentacion);
            ri.setIdAlmacen(g.idAlmacen);
            ri.setCantidadProcesada(g.total);
            ri.setLotes(g.lotes);
            resultados.add(ri);
        }

        resp.setItemsProcesados(resultados.size());
        resp.setResultados(resultados);
        return resp;
    }

    @Transactional(readOnly = true)
    public ReservaAnticipoRespuestaDTO verReservas(Long idAnticipo) {
        anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));

        var rows = movRepo.reservasVigentesPorAnticipo(idAnticipo);

        record Key(Long idPresentacion, Long idAlmacen) {}
        Map<Key, List<MovimientoInventarioRepositorio.ReservaVigenteRow>> groups = new LinkedHashMap<>();
        for (var r : rows) {
            var k = new Key(r.getIdPresentacion(), r.getIdAlmacen());
            groups.computeIfAbsent(k, __ -> new ArrayList<>()).add(r);
        }

        List<ReservaAnticipoRespuestaDTO.ResultadoItem> resultados = new ArrayList<>();

        for (var e : groups.entrySet()) {
            var key = e.getKey();
            List<ReservaAnticipoRespuestaDTO.LotePick> lotes = new ArrayList<>();
            BigDecimal total = BigDecimal.ZERO;

            for (var r : e.getValue()) {
                var lp = new ReservaAnticipoRespuestaDTO.LotePick();
                lp.setIdLote(r.getIdLote());
                lp.setNumeroLote(r.getNumeroLote());
                lp.setFechaVencimiento(r.getFechaVencimiento());
                lp.setCantidad(r.getCantidad());
                lotes.add(lp);
                total = total.add(r.getCantidad());
            }

            var ri = new ReservaAnticipoRespuestaDTO.ResultadoItem();
            ri.setIdPresentacion(key.idPresentacion());
            ri.setIdAlmacen(key.idAlmacen());
            ri.setCantidadProcesada(total);
            ri.setLotes(lotes);
            resultados.add(ri);
        }

        var resp = new ReservaAnticipoRespuestaDTO();
        resp.setIdAnticipo(idAnticipo);
        resp.setOperacion("consulta");
        resp.setItemsProcesados(resultados.size());
        resp.setResultados(resultados);
        return resp;
    }

    // ===================== helpers =====================
    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
    private static BigDecimal min(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) <= 0 ? a : b;
    }
}
