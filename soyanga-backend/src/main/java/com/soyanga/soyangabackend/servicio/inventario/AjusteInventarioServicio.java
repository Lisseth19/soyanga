package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.inventario.AjusteCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.AjusteRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.inventario.AjusteInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AjusteInventarioServicio {

        private final ExistenciaLoteRepositorio existenciaRepo;
        private final MovimientoInventarioRepositorio movRepo;
        private final AjusteInventarioRepositorio ajusteRepo;
        private final AuditoriaServicio auditoriaServicio;

        private Long currentUserId() {
                return 1L;
        } // reemplaza por SecurityContext

        @Transactional
        public AjusteRespuestaDTO ingreso(AjusteCrearDTO dto) {
                return registrarYAplicar(dto, AjusteInventario.Tipo.INGRESO);
        }

        @Transactional
        public AjusteRespuestaDTO salida(AjusteCrearDTO dto) {
                return registrarYAplicar(dto, AjusteInventario.Tipo.EGRESO);
        }

        private AjusteRespuestaDTO registrarYAplicar(AjusteCrearDTO dto, AjusteInventario.Tipo tipo) {

                // idempotencia
                var existente = ajusteRepo.findByRequestId(dto.getRequestId());
                if (existente.isPresent()) {
                        var aj = existente.get();
                        var mov = (aj.getIdMovimiento() != null) ? movRepo.findById(aj.getIdMovimiento()).orElse(null)
                                        : null;
                        return AjusteRespuestaDTO.builder()
                                        .idMovimiento(mov != null ? mov.getIdMovimiento() : null)
                                        .tipo(aj.getTipo() == AjusteInventario.Tipo.INGRESO ? "ingreso" : "salida")
                                        .idAlmacen(aj.getIdAlmacen())
                                        .idLote(aj.getIdLote())
                                        .cantidadAjustada(mov != null ? mov.getCantidad()
                                                        : (aj.getTipo() == AjusteInventario.Tipo.INGRESO
                                                                        ? aj.getCantidad()
                                                                        : aj.getCantidad().negate()))
                                        .fechaMovimiento(mov != null ? mov.getFechaMovimiento() : aj.getAplicadoEn())
                                        .observaciones(aj.getObservaciones())
                                        .build();
                }

                // Validaciones comunes
                if (dto.getCantidad() == null || dto.getCantidad().compareTo(BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("La cantidad debe ser mayor que cero.");
                }
                if (dto.getIdAlmacen() == null || dto.getIdLote() == null) {
                        throw new IllegalArgumentException("idAlmacen e idLote son obligatorios.");
                }

                var ahora = LocalDateTime.now();

                // --- 1) Validaciones de negocio específicas de EGRESO ---
                // lock pesimista para evitar carreras
                var exOpt = existenciaRepo.lockByAlmacenAndIdLote(dto.getIdAlmacen(), dto.getIdLote());

                if (tipo == AjusteInventario.Tipo.EGRESO) {
                        if (exOpt.isEmpty()) {
                                // Si el lote existe en otro almacén, el mensaje debe ser "lote no pertenece al
                                // almacén"
                                boolean loteExisteEnAlgunaExistencia = existenciaRepo.existsByIdLote(dto.getIdLote());
                                if (loteExisteEnAlgunaExistencia) {
                                        throw new IllegalArgumentException(
                                                        "El lote " + dto.getIdLote() + " no pertenece al almacén "
                                                                        + dto.getIdAlmacen() + ".");
                                } else {
                                        // No hay ningún registro de existencias para ese lote
                                        throw new IllegalArgumentException(
                                                        "El lote " + dto.getIdLote() + " no existe en inventario.");
                                }
                        } else {
                                var exTmp = exOpt.get();
                                if (exTmp.getCantidadDisponible().compareTo(dto.getCantidad()) < 0) {
                                        throw new IllegalArgumentException(
                                                        "Stock insuficiente en almacén " + dto.getIdAlmacen()
                                                                        + " para lote " + dto.getIdLote()
                                                                        + ": disponible="
                                                                        + exTmp.getCantidadDisponible()
                                                                        + ", solicitado=" + dto.getCantidad());
                                }
                        }
                }
                // --- fin validaciones EGRESO ---

                // 2) Crear header del ajuste
                var ajuste = AjusteInventario.builder()
                                .tipo(tipo)
                                .idAlmacen(dto.getIdAlmacen())
                                .idLote(dto.getIdLote())
                                .cantidad(dto.getCantidad())
                                .motivo(dto.getMotivoCodigo())
                                .observaciones(dto.getObservaciones())
                                .estado(AjusteInventario.Estado.APLICADO)
                                .creadoPor(currentUserId())
                                .creadoEn(ahora)
                                .aplicadoEn(ahora)
                                .requestId(dto.getRequestId())
                                .build();
                ajuste = ajusteRepo.save(ajuste);

                // 3) Impacto en existencias
                var ex = exOpt.orElseGet(() -> {
                        // Sólo se crea registro nuevo cuando es INGRESO
                        if (tipo == AjusteInventario.Tipo.EGRESO) {
                                // (no debería llegar aquí por las validaciones previas)
                                throw new IllegalArgumentException(
                                                "No existe stock para salida en almacén=" + dto.getIdAlmacen()
                                                                + " lote=" + dto.getIdLote());
                        }
                        return ExistenciaPorLote.builder()
                                        .idAlmacen(dto.getIdAlmacen())
                                        .idLote(dto.getIdLote())
                                        .cantidadDisponible(BigDecimal.ZERO)
                                        .cantidadReservada(BigDecimal.ZERO)
                                        .stockMinimo(BigDecimal.ZERO)
                                        .build();
                });

                var antes = ex.getCantidadDisponible();
                BigDecimal despues;

                if (tipo == AjusteInventario.Tipo.INGRESO) {
                        despues = antes.add(dto.getCantidad());
                } else {
                        // seguridad extra (ya validado)
                        if (antes.compareTo(dto.getCantidad()) < 0) {
                                throw new IllegalArgumentException(
                                                "Stock insuficiente: disponible=" + antes + ", egreso="
                                                                + dto.getCantidad());
                        }
                        despues = antes.subtract(dto.getCantidad());
                }
                ex.setCantidadDisponible(despues);
                ex.setFechaUltimaActualizacion(ahora);
                existenciaRepo.save(ex);

                // 4) Movimiento (kárdex)
                var cantidadMov = (tipo == AjusteInventario.Tipo.INGRESO) ? dto.getCantidad()
                                : dto.getCantidad().negate();
                var mov = movRepo.save(MovimientoInventario.builder()
                                .fechaMovimiento(ahora)
                                .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                                .idAlmacenOrigen(tipo == AjusteInventario.Tipo.EGRESO ? dto.getIdAlmacen() : null)
                                .idAlmacenDestino(tipo == AjusteInventario.Tipo.INGRESO ? dto.getIdAlmacen() : null)
                                .idLote(dto.getIdLote())
                                .cantidad(cantidadMov)
                                .referenciaModulo("ajuste")
                                .idReferencia(ajuste.getIdAjuste())
                                .observaciones((dto.getObservaciones() != null ? dto.getObservaciones() + " | " : "")
                                                + (tipo == AjusteInventario.Tipo.INGRESO ? "Ajuste ingreso"
                                                                : "Ajuste egreso")
                                                + " | motivo=" + dto.getMotivoCodigo()
                                                + " | user=" + currentUserId())
                                .build());

                // 5) Trazabilidad
                ajuste.setIdMovimiento(mov.getIdMovimiento());
                ajusteRepo.save(ajuste);

                auditoriaServicio.registrar(Auditoria.builder()
                                .fechaEvento(ahora)
                                .idUsuario(currentUserId())
                                .moduloAfectado("inventario.ajustes")
                                .accion("crear_aplicar")
                                .idRegistroAfectado(ajuste.getIdAjuste())
                                .detalle("Ajuste " + tipo + " almacén=" + dto.getIdAlmacen()
                                                + ", lote=" + dto.getIdLote() + ", cant=" + dto.getCantidad()
                                                + ", motivo=" + dto.getMotivoCodigo())
                                .build());

                return mapRespuestaFrom(ajuste, mov, antes, despues);
        }

        private AjusteRespuestaDTO mapRespuestaFrom(AjusteInventario aj,
                        MovimientoInventario mov,
                        BigDecimal antes,
                        BigDecimal despues) {
                var tipoStr = (aj.getTipo() == AjusteInventario.Tipo.INGRESO) ? "ingreso" : "salida";
                BigDecimal cantAjustada = (mov != null) ? mov.getCantidad()
                                : (aj.getTipo() == AjusteInventario.Tipo.INGRESO ? aj.getCantidad()
                                                : aj.getCantidad().negate());

                return AjusteRespuestaDTO.builder()
                                .idMovimiento(mov != null ? mov.getIdMovimiento() : null)
                                .tipo(tipoStr)
                                .idAlmacen(aj.getIdAlmacen())
                                .idLote(aj.getIdLote())
                                .cantidadAjustada(cantAjustada)
                                .cantidadAnterior(antes)
                                .cantidadNueva(despues)
                                .fechaMovimiento(mov != null ? mov.getFechaMovimiento() : aj.getAplicadoEn())
                                .observaciones(aj.getObservaciones())
                                .build();
        }
}
