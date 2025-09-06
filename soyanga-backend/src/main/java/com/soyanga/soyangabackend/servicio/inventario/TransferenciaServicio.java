package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dominio.ExistenciaPorLote;
import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.dominio.TransferenciaDetalle;
import com.soyanga.soyangabackend.dominio.TransferenciaEntreAlmacenes;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.inventario.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TransferenciaServicio {

    private final TransferenciaRepositorio transferenciaRepo;
    private final TransferenciaDetalleRepositorio transferenciaDetRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;

    @Transactional
    public TransferenciaRespuestaDTO transferirYCompletar(TransferenciaCrearDTO dto) {
        if (dto.getIdAlmacenOrigen().equals(dto.getIdAlmacenDestino())) {
            throw new IllegalArgumentException("El almacén origen y destino deben ser distintos");
        }
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("La transferencia debe tener items");
        }

        var fecha = dto.getFechaTransferencia() != null ? dto.getFechaTransferencia() : LocalDateTime.now();

        // Cabecera: la dejamos directamente como "completada"
        var cab = TransferenciaEntreAlmacenes.builder()
                .fechaTransferencia(fecha)
                .idAlmacenOrigen(dto.getIdAlmacenOrigen())
                .idAlmacenDestino(dto.getIdAlmacenDestino())
                .estadoTransferencia(TransferenciaEntreAlmacenes.EstadoTransferencia.completada)
                .observaciones(dto.getObservaciones())
                .build();
        cab = transferenciaRepo.save(cab);

        int procesados = 0;

        for (var it : dto.getItems()) {
            // 1) Bloqueamos existencia en ORIGEN y validamos saldo
            var exOrigen = existenciaRepo.lockByAlmacenAndIdLote(dto.getIdAlmacenOrigen(), it.getIdLote())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "No existe stock en origen para lote " + it.getIdLote()));

            if (exOrigen.getCantidadDisponible().compareTo(it.getCantidad()) < 0) {
                throw new IllegalArgumentException(
                        "Stock insuficiente en origen para lote " + it.getIdLote()
                                + " (disp=" + exOrigen.getCantidadDisponible() + ", req=" + it.getCantidad() + ")");
            }

            // 2) Restamos en ORIGEN
            exOrigen.setCantidadDisponible(exOrigen.getCantidadDisponible().subtract(it.getCantidad()));
            exOrigen.setFechaUltimaActualizacion(LocalDateTime.now());
            existenciaRepo.save(exOrigen);

            // 3) Sumamos en DESTINO (o creamos existencia)
            var exDestino = existenciaRepo.lockByAlmacenAndIdLote(dto.getIdAlmacenDestino(), it.getIdLote())
                    .orElseGet(() -> ExistenciaPorLote.builder()
                            .idAlmacen(dto.getIdAlmacenDestino())
                            .idLote(it.getIdLote())
                            .cantidadDisponible(BigDecimal.ZERO)
                            .cantidadReservada(BigDecimal.ZERO)
                            .stockMinimo(BigDecimal.ZERO)
                            .build());
            exDestino.setCantidadDisponible(exDestino.getCantidadDisponible().add(it.getCantidad()));
            exDestino.setFechaUltimaActualizacion(LocalDateTime.now());
            existenciaRepo.save(exDestino);

            // 4) Guardamos detalle de transferencia
            var det = TransferenciaDetalle.builder()
                    .idTransferencia(cab.getIdTransferencia())
                    .idLote(it.getIdLote())
                    .cantidad(it.getCantidad())
                    .build();
            transferenciaDetRepo.save(det);

            // 5) Movimientos (salida/ingreso)
            var movOut = MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.transferencia_salida)
                    .idAlmacenOrigen(dto.getIdAlmacenOrigen())
                    .idLote(it.getIdLote())
                    .cantidad(it.getCantidad())
                    .referenciaModulo("transferencia")
                    .idReferencia(cab.getIdTransferencia())
                    .observaciones("Salida por transferencia #" + cab.getIdTransferencia())
                    .build();
            movRepo.save(movOut);

            var movIn = MovimientoInventario.builder()
                    .fechaMovimiento(LocalDateTime.now())
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.transferencia_ingreso)
                    .idAlmacenDestino(dto.getIdAlmacenDestino())
                    .idLote(it.getIdLote())
                    .cantidad(it.getCantidad())
                    .referenciaModulo("transferencia")
                    .idReferencia(cab.getIdTransferencia())
                    .observaciones("Ingreso por transferencia #" + cab.getIdTransferencia())
                    .build();
            movRepo.save(movIn);

            procesados++;
        }

        return TransferenciaRespuestaDTO.builder()
                .idTransferencia(cab.getIdTransferencia())
                .estado(cab.getEstadoTransferencia().name()) // 👈 ".name()" devuelve "completada"
                // si prefieres minúsculas: .name().toLowerCase()
                .itemsProcesados(procesados)
                .build();
    }
}
