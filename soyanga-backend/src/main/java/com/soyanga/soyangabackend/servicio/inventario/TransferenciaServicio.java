package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dominio.ExistenciaPorLote;
import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.dominio.TransferenciaDetalle;
import com.soyanga.soyangabackend.dominio.TransferenciaEntreAlmacenes;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.inventario.ExistenciaLoteRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.TransferenciaDetalleRepositorio;
import com.soyanga.soyangabackend.repositorio.inventario.TransferenciaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TransferenciaServicio {

    private final TransferenciaRepositorio transferenciaRepo;
    private final TransferenciaDetalleRepositorio detalleRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;
    private final TransferenciaDetalleRepositorio detRepo;
    /* ---------------------------
     * VALIDACIONES COMUNES
     * --------------------------- */
    private void validarCrear(TransferenciaCrearDTO dto) {
        if (dto.getIdAlmacenOrigen() == null || dto.getIdAlmacenDestino() == null) {
            throw new IllegalArgumentException("Debe indicar almacén origen y destino");
        }
        if (dto.getIdAlmacenOrigen().equals(dto.getIdAlmacenDestino())) {
            throw new IllegalArgumentException("El almacén de origen y destino no pueden ser el mismo");
        }
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("Debe indicar al menos un ítem (idLote, cantidad)");
        }
        dto.getItems().forEach(it -> {
            if (it.getIdLote() == null) {
                throw new IllegalArgumentException("idLote es requerido");
            }
            if (it.getCantidad() == null || it.getCantidad().compareTo(new BigDecimal("0.000001")) < 0) {
                throw new IllegalArgumentException("cantidad debe ser > 0");
            }
        });
    }

    private TransferenciaEntreAlmacenes crearCabeceraYDetalles(TransferenciaCrearDTO dto,
                                                               TransferenciaEntreAlmacenes.EstadoTransferencia estado) {
        final LocalDateTime fecha = dto.getFechaTransferencia() != null
                ? dto.getFechaTransferencia()
                : LocalDateTime.now();

        var t = TransferenciaEntreAlmacenes.builder()
                .fechaTransferencia(fecha)
                .idAlmacenOrigen(dto.getIdAlmacenOrigen())
                .idAlmacenDestino(dto.getIdAlmacenDestino())
                .estadoTransferencia(estado)
                .observaciones(dto.getObservaciones())
                .build();
        transferenciaRepo.save(t);

        dto.getItems().forEach(it -> {
            var d = TransferenciaDetalle.builder()
                    .idTransferencia(t.getIdTransferencia())
                    .idLote(it.getIdLote())
                    .cantidad(it.getCantidad())
                    .build();
            detalleRepo.save(d);
        });

        return t;
    }

    private void registrarSalida(TransferenciaEntreAlmacenes t, TransferenciaCrearDTO dto) {
        // Verificar stock disponible en ORIGEN
        for (var it : dto.getItems()) {
            var exOpt = existenciaRepo.lockByAlmacenAndIdLote(t.getIdAlmacenOrigen(), it.getIdLote());
            if (exOpt.isEmpty()) {
                throw new IllegalArgumentException("No existe existencia del lote " + it.getIdLote() +
                        " en el almacén de origen");
            }
            var ex = exOpt.get();
            if (ex.getCantidadDisponible().compareTo(it.getCantidad()) < 0) {
                throw new IllegalArgumentException("Stock insuficiente para lote " + it.getIdLote() +
                        " (disp: " + ex.getCantidadDisponible() + ", req: " + it.getCantidad() + ")");
            }
        }

        // Descuento + kárdex
        for (var it : dto.getItems()) {
            var ex = existenciaRepo.lockByAlmacenAndIdLote(t.getIdAlmacenOrigen(), it.getIdLote())
                    .orElseThrow();
            ex.setCantidadDisponible(ex.getCantidadDisponible().subtract(it.getCantidad()));
            existenciaRepo.save(ex);

            movRepo.save(MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.transferencia_salida)
                    .idAlmacenOrigen(t.getIdAlmacenOrigen())
                    .idAlmacenDestino(t.getIdAlmacenDestino())
                    .idLote(it.getIdLote())
                    .cantidad(it.getCantidad())
                    .referenciaModulo("transferencia")
                    .idReferencia(t.getIdTransferencia())
                    .observaciones("Salida de transferencia " + t.getIdTransferencia())
                    .build());
        }
    }

    private void registrarIngreso(TransferenciaEntreAlmacenes t, TransferenciaCrearDTO dto) {
        // Suma + kárdex en DESTINO
        for (var it : dto.getItems()) {
            var exDestino = existenciaRepo.lockByAlmacenAndIdLote(t.getIdAlmacenDestino(), it.getIdLote())
                    .orElseGet(() -> ExistenciaPorLote.builder()
                            .idAlmacen(t.getIdAlmacenDestino())
                            .idLote(it.getIdLote())
                            .cantidadDisponible(BigDecimal.ZERO)
                            .cantidadReservada(BigDecimal.ZERO)
                            .stockMinimo(BigDecimal.ZERO)
                            .build());
            exDestino.setCantidadDisponible(exDestino.getCantidadDisponible().add(it.getCantidad()));
            existenciaRepo.save(exDestino);

            movRepo.save(MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.transferencia_ingreso)
                    .idAlmacenOrigen(t.getIdAlmacenOrigen())
                    .idAlmacenDestino(t.getIdAlmacenDestino())
                    .idLote(it.getIdLote())
                    .cantidad(it.getCantidad())
                    .referenciaModulo("transferencia")
                    .idReferencia(t.getIdTransferencia())
                    .observaciones("Ingreso de transferencia " + t.getIdTransferencia())
                    .build());
        }
    }

    /* ---------------------------
     * ONE-STEP
     * --------------------------- */
    @Transactional
    public TransferenciaRespuestaDTO transferirYCompletar(TransferenciaCrearDTO dto) {
        validarCrear(dto);
        var t = crearCabeceraYDetalles(dto, TransferenciaEntreAlmacenes.EstadoTransferencia.pendiente);
        registrarSalida(t, dto);
        registrarIngreso(t, dto);
        t.setEstadoTransferencia(TransferenciaEntreAlmacenes.EstadoTransferencia.completada);
        transferenciaRepo.save(t);

        return TransferenciaRespuestaDTO.builder()
                .idTransferencia(t.getIdTransferencia())
                .fecha(t.getFechaTransferencia())
                .estado(t.getEstadoTransferencia().name())
                .idAlmacenOrigen(t.getIdAlmacenOrigen())
                .idAlmacenDestino(t.getIdAlmacenDestino())
                .observaciones(t.getObservaciones())
                .build();
    }

    /* ---------------------------
     * TWO-STEP
     * --------------------------- */
    @Transactional
    public TransferenciaRespuestaDTO crearPendiente(TransferenciaCrearDTO dto) {
        validarCrear(dto);
        var t = crearCabeceraYDetalles(dto, TransferenciaEntreAlmacenes.EstadoTransferencia.pendiente);
        return TransferenciaRespuestaDTO.builder()
                .idTransferencia(t.getIdTransferencia())
                .fecha(t.getFechaTransferencia())
                .estado(t.getEstadoTransferencia().name())
                .idAlmacenOrigen(t.getIdAlmacenOrigen())
                .idAlmacenDestino(t.getIdAlmacenDestino())
                .observaciones(t.getObservaciones())
                .build();
    }

    @Transactional
    public TransferenciaRespuestaDTO confirmarSalida(Long idTransferencia) {
        var t = transferenciaRepo.findById(idTransferencia)
                .orElseThrow(() -> new IllegalArgumentException("Transferencia no encontrada: " + idTransferencia));

        if (t.getEstadoTransferencia() != TransferenciaEntreAlmacenes.EstadoTransferencia.pendiente) {
            throw new IllegalStateException("Solo se puede confirmar salida desde estado 'pendiente'");
        }

        // Cargar detalles desde BD
        var detalles = detalleRepo.findByIdTransferencia(idTransferencia);
        if (detalles.isEmpty()) throw new IllegalStateException("La transferencia no tiene detalles");

        // Reusar DTO temporal para la misma lógica
        var dto = new TransferenciaCrearDTO();
        dto.setIdAlmacenOrigen(t.getIdAlmacenOrigen());
        dto.setIdAlmacenDestino(t.getIdAlmacenDestino());
        dto.setFechaTransferencia(t.getFechaTransferencia());
        dto.setObservaciones(t.getObservaciones());
        dto.setItems(detalles.stream().map(d ->
                TransferenciaCrearDTO.Item.builder()
                        .idLote(d.getIdLote())
                        .cantidad(d.getCantidad())
                        .build()
        ).toList());

        registrarSalida(t, dto);

        t.setEstadoTransferencia(TransferenciaEntreAlmacenes.EstadoTransferencia.en_transito);
        transferenciaRepo.save(t);

        return TransferenciaRespuestaDTO.builder()
                .idTransferencia(t.getIdTransferencia())
                .fecha(t.getFechaTransferencia())
                .estado(t.getEstadoTransferencia().name())
                .idAlmacenOrigen(t.getIdAlmacenOrigen())
                .idAlmacenDestino(t.getIdAlmacenDestino())
                .observaciones(t.getObservaciones())
                .build();
    }

    @Transactional
    public TransferenciaRespuestaDTO confirmarIngreso(Long idTransferencia) {
        var t = transferenciaRepo.findById(idTransferencia)
                .orElseThrow(() -> new IllegalArgumentException("Transferencia no encontrada: " + idTransferencia));

        if (t.getEstadoTransferencia() != TransferenciaEntreAlmacenes.EstadoTransferencia.en_transito) {
            throw new IllegalStateException("Solo se puede confirmar ingreso desde estado 'en_transito'");
        }

        var detalles = detalleRepo.findByIdTransferencia(idTransferencia);
        if (detalles.isEmpty()) throw new IllegalStateException("La transferencia no tiene detalles");

        var dto = new TransferenciaCrearDTO();
        dto.setIdAlmacenOrigen(t.getIdAlmacenOrigen());
        dto.setIdAlmacenDestino(t.getIdAlmacenDestino());
        dto.setFechaTransferencia(t.getFechaTransferencia());
        dto.setObservaciones(t.getObservaciones());
        dto.setItems(detalles.stream().map(d ->
                TransferenciaCrearDTO.Item.builder()
                        .idLote(d.getIdLote())
                        .cantidad(d.getCantidad())
                        .build()
        ).toList());

        registrarIngreso(t, dto);

        t.setEstadoTransferencia(TransferenciaEntreAlmacenes.EstadoTransferencia.completada);
        transferenciaRepo.save(t);

        return TransferenciaRespuestaDTO.builder()
                .idTransferencia(t.getIdTransferencia())
                .fecha(t.getFechaTransferencia())
                .estado(t.getEstadoTransferencia().name())
                .idAlmacenOrigen(t.getIdAlmacenOrigen())
                .idAlmacenDestino(t.getIdAlmacenDestino())
                .observaciones(t.getObservaciones())
                .build();
    }
    @Transactional
    public TransferenciaRespuestaDTO anular(Long idTransferencia, String motivo) {
        var tx = transferenciaRepo.findById(idTransferencia)
                .orElseThrow(() -> new IllegalArgumentException("Transferencia no encontrada: " + idTransferencia));

        if (tx.getEstadoTransferencia() == TransferenciaEntreAlmacenes.EstadoTransferencia.anulada) {
            throw new IllegalArgumentException("La transferencia ya está anulada");
        }

        // Traer items (lote + cantidad)
        var items = detRepo.itemsPorTransferencia(idTransferencia);
        if (items.isEmpty()) {
            // no debería pasar, pero por seguridad
            tx.setEstadoTransferencia(TransferenciaEntreAlmacenes.EstadoTransferencia.anulada);
            transferenciaRepo.save(tx);
            return TransferenciaRespuestaDTO.builder()
                    .idTransferencia(tx.getIdTransferencia())
                    .estado(tx.getEstadoTransferencia().name())
                    .fecha(tx.getFechaTransferencia())
                    .idAlmacenOrigen(tx.getIdAlmacenOrigen())
                    .idAlmacenDestino(tx.getIdAlmacenDestino())
                    .observaciones(tx.getObservaciones())
                    .itemsProcesados(0)
                    .build();
        }

        var estado = tx.getEstadoTransferencia();
        int procesados = 0;

        for (var it : items) {
            Long idLote = it.getIdLote();
            var cant = it.getCantidad();

            switch (estado) {
                case pendiente -> {
                    // No tocó stock; nada que revertir
                }
                case en_transito -> {
                    // Reponer en ORIGEN (se había descontado en salida)
                    var exOrig = existenciaRepo.lockByAlmacenAndIdLote(tx.getIdAlmacenOrigen(), idLote)
                            .orElseGet(() -> ExistenciaPorLote.builder()
                                    .idAlmacen(tx.getIdAlmacenOrigen())
                                    .idLote(idLote)
                                    .cantidadDisponible(BigDecimal.ZERO)
                                    .cantidadReservada(BigDecimal.ZERO)
                                    .stockMinimo(BigDecimal.ZERO)
                                    .build());
                    exOrig.setCantidadDisponible(exOrig.getCantidadDisponible().add(cant));
                    existenciaRepo.save(exOrig);

                    // Kardex: ajuste positivo (ingreso al ORIGEN)
                    movRepo.save(MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                            .idAlmacenOrigen(null)
                            .idAlmacenDestino(tx.getIdAlmacenOrigen())
                            .idLote(idLote)
                            .cantidad(cant) // + ingresa
                            .referenciaModulo("transferencia")
                            .idReferencia(idTransferencia)
                            .observaciones("Anulación transferencia " + idTransferencia + (motivo != null ? " — " + motivo : ""))
                            .build());

                    procesados++;
                }
                case completada -> {
                    // 1) Descontar en DESTINO (validando disponible)
                    var exDest = existenciaRepo.lockByAlmacenAndIdLote(tx.getIdAlmacenDestino(), idLote)
                            .orElseThrow(() -> new IllegalStateException(
                                    "No existe stock en destino para el lote " + idLote + " de la transferencia " + idTransferencia));

                    if (exDest.getCantidadDisponible().compareTo(cant) < 0) {
                        throw new IllegalStateException("Destino no tiene disponible suficiente para revertir el lote "
                                + idLote + ". Disponible=" + exDest.getCantidadDisponible() + ", a revertir=" + cant);
                    }
                    exDest.setCantidadDisponible(exDest.getCantidadDisponible().subtract(cant));
                    existenciaRepo.save(exDest);

                    // Kardex: ajuste negativo (salida del DESTINO)
                    movRepo.save(MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                            .idAlmacenOrigen(tx.getIdAlmacenDestino())
                            .idAlmacenDestino(null)
                            .idLote(idLote)
                            .cantidad(cant.negate()) // - sale
                            .referenciaModulo("transferencia")
                            .idReferencia(idTransferencia)
                            .observaciones("Anulación transferencia " + idTransferencia + (motivo != null ? " — " + motivo : ""))
                            .build());

                    // 2) Reponer en ORIGEN
                    var exOrig = existenciaRepo.lockByAlmacenAndIdLote(tx.getIdAlmacenOrigen(), idLote)
                            .orElseGet(() -> ExistenciaPorLote.builder()
                                    .idAlmacen(tx.getIdAlmacenOrigen())
                                    .idLote(idLote)
                                    .cantidadDisponible(BigDecimal.ZERO)
                                    .cantidadReservada(BigDecimal.ZERO)
                                    .stockMinimo(BigDecimal.ZERO)
                                    .build());
                    exOrig.setCantidadDisponible(exOrig.getCantidadDisponible().add(cant));
                    existenciaRepo.save(exOrig);

                    // Kardex: ajuste positivo (ingreso al ORIGEN)
                    movRepo.save(MovimientoInventario.builder()
                            .fechaMovimiento(LocalDateTime.now())
                            .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                            .idAlmacenOrigen(null)
                            .idAlmacenDestino(tx.getIdAlmacenOrigen())
                            .idLote(idLote)
                            .cantidad(cant) // + ingresa
                            .referenciaModulo("transferencia")
                            .idReferencia(idTransferencia)
                            .observaciones("Anulación transferencia " + idTransferencia + (motivo != null ? " — " + motivo : ""))
                            .build());

                    procesados++;
                }
                default -> throw new IllegalStateException("Estado no soportado para anulación: " + estado);
            }
        }

        tx.setEstadoTransferencia(TransferenciaEntreAlmacenes.EstadoTransferencia.anulada);
        transferenciaRepo.save(tx);

        return TransferenciaRespuestaDTO.builder()
                .idTransferencia(tx.getIdTransferencia())
                .estado(tx.getEstadoTransferencia().name())
                .fecha(tx.getFechaTransferencia())
                .idAlmacenOrigen(tx.getIdAlmacenOrigen())
                .idAlmacenDestino(tx.getIdAlmacenDestino())
                .observaciones(tx.getObservaciones())
                .itemsProcesados(procesados)
                .build();
    }

}
