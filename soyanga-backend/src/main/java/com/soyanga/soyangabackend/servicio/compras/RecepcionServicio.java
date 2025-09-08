package com.soyanga.soyangabackend.servicio.compras;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.compras.*;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.compras.*;
import com.soyanga.soyangabackend.repositorio.inventario.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecepcionServicio {

    private final CompraRepositorio compraRepo;
    private final CompraDetalleRepositorio compraDetRepo;

    private final RecepcionPedidoRepositorio recepRepo;
    private final RecepcionDetalleRepositorio recepDetRepo;

    private final PresentacionProductoRepositorio presentacionRepo;
    private final LoteRepositorio loteRepo;
    private final ExistenciaLoteRepositorio existenciaRepo;
    private final MovimientoInventarioRepositorio movRepo;

    @Transactional
    public RecepcionRespuestaDTO registrar(RecepcionCrearDTO dto) {
        var compra = compraRepo.findById(dto.getIdCompra())
                .orElseThrow(() -> new IllegalArgumentException("Compra no encontrada: " + dto.getIdCompra()));

        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("La recepción debe tener items");
        }

        var fecha = dto.getFechaRecepcion() != null ? dto.getFechaRecepcion() : LocalDateTime.now();

        // 1) Cabecera
        var cab = RecepcionPedido.builder()
                .idCompra(compra.getIdCompra())
                .fechaRecepcion(fecha)
                .idAlmacen(dto.getIdAlmacen())
                .numeroDocumentoProveedor(dto.getNumeroDocumentoProveedor())
                .estadoRecepcion("registrada")
                .observaciones(dto.getObservaciones())
                .build();
        cab = recepRepo.save(cab);

        int creados = 0;

        // 2) Por cada item: detalle + lote + existencia + movimiento
        for (var it : dto.getItems()) {

            // Validaciones cruzadas básicas
            var detCompra = compraDetRepo.findById(it.getIdCompraDetalle())
                    .orElseThrow(() -> new IllegalArgumentException("Detalle de compra no encontrado: " + it.getIdCompraDetalle()));
            if (!detCompra.getIdCompra().equals(compra.getIdCompra())) {
                throw new IllegalArgumentException("El detalle " + it.getIdCompraDetalle() + " no pertenece a la compra " + compra.getIdCompra());
            }
            if (!detCompra.getIdPresentacion().equals(it.getIdPresentacion())) {
                throw new IllegalArgumentException("idPresentacion no coincide con el detalle de compra");
            }

            presentacionRepo.findById(it.getIdPresentacion())
                    .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada: " + it.getIdPresentacion()));

            // 2.1) Detalle de recepción
            var det = RecepcionDetalle.builder()
                    .idRecepcion(cab.getIdRecepcion())
                    .idCompraDetalle(it.getIdCompraDetalle())
                    .idPresentacion(it.getIdPresentacion())
                    .cantidadRecibida(it.getCantidadRecibida())
                    .costoUnitarioMoneda(it.getCostoUnitarioMoneda())
                    .observaciones(it.getObservaciones())
                    .build();
            det = recepDetRepo.save(det);

            // 2.2) Lote
            var lote = Lote.builder()
                    .idRecepcionDetalle(det.getIdRecepcionDetalle())
                    .idPresentacion(it.getIdPresentacion())
                    .numeroLote(it.getNumeroLote().trim())
                    .fechaFabricacion(it.getFechaFabricacion())
                    .fechaVencimiento(it.getFechaVencimiento())
                    .observaciones(it.getObservaciones())
                    .build();
            lote = loteRepo.save(lote);

            // 2.3) Existencia por (almacén,lote)
            final Long idAlmacen = dto.getIdAlmacen();
            final Long idLote = lote.getIdLote();

            var exOpt = existenciaRepo.findByIdAlmacenAndIdLote(idAlmacen, idLote);

            ExistenciaPorLote ex = exOpt.orElseGet(() -> ExistenciaPorLote.builder()
                    .idAlmacen(idAlmacen)
                    .idLote(idLote)
                    .cantidadDisponible(BigDecimal.ZERO)
                    .cantidadReservada(BigDecimal.ZERO)
                    .stockMinimo(BigDecimal.ZERO)
                    .build());

            ex.setCantidadDisponible(ex.getCantidadDisponible().add(it.getCantidadRecibida()));
            ex.setFechaUltimaActualizacion(java.time.LocalDateTime.now());
            ex = existenciaRepo.save(ex);


            ex.setCantidadDisponible(ex.getCantidadDisponible().add(it.getCantidadRecibida()));
            ex.setFechaUltimaActualizacion(LocalDateTime.now());
            ex = existenciaRepo.save(ex);

            // 2.4) Movimiento
            var mov = MovimientoInventario.builder()
                    .fechaMovimiento(java.time.LocalDateTime.now()) // o dejar que @PrePersist lo rellene
                    .tipoMovimiento(MovimientoInventario.TipoMovimiento.ingreso_compra)
                    .idAlmacenDestino(dto.getIdAlmacen())
                    .idLote(lote.getIdLote())
                    .cantidad(it.getCantidadRecibida())
                    .referenciaModulo("recepcion")
                    .idReferencia(det.getIdRecepcionDetalle())
                    .observaciones("Ingreso por recepción " + cab.getIdRecepcion())
                    .build();

            movRepo.save(mov);

            creados++;
        }

        // (Opcional) actualizar estado_compra a 'parcial' o 'recibida' según saldos — lo dejamos para más adelante.
        return RecepcionRespuestaDTO.builder()
                .idRecepcion(cab.getIdRecepcion())
                .estado(cab.getEstadoRecepcion())
                .itemsCreados(creados)
                .build();
    }
    @Transactional
    public void cerrar(Long idRecepcion) {
        var recep = recepRepo.findById(idRecepcion)
                .orElseThrow(() -> new IllegalArgumentException("Recepción no encontrada: " + idRecepcion));

        // Si tu RecepcionPedido también usa enum para estado, ajusta aquí a su enum.
        if ("anulada".equalsIgnoreCase(recep.getEstadoRecepcion())) {
            throw new IllegalArgumentException("No se puede cerrar una recepción anulada");
        }
        if ("cerrada".equalsIgnoreCase(recep.getEstadoRecepcion())) {
            return; // idempotente
        }
        recep.setEstadoRecepcion("cerrada"); // o enum si lo tienes como enum
        recepRepo.save(recep);

        var compra = compraRepo.findById(recep.getIdCompra())
                .orElseThrow(() -> new IllegalArgumentException("Compra no encontrada: " + recep.getIdCompra()));

        var dets = compraDetRepo.findByIdCompra(compra.getIdCompra());
        BigDecimal totalPedido = dets.stream()
                .map(CompraDetalle::getCantidad)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        var recepciones = recepRepo.findByIdCompra(compra.getIdCompra());
        BigDecimal totalRecibido = BigDecimal.ZERO;
        for (var r : recepciones) {
            var detsR = recepDetRepo.findByIdRecepcion(r.getIdRecepcion());
            var suma = detsR.stream()
                    .map(RecepcionDetalle::getCantidadRecibida)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalRecibido = totalRecibido.add(suma);
        }

        // ⬇⬇⬇ USAR ENUM, NO STRING ⬇⬇⬇
        Compra.EstadoCompra nuevoEstado;
        if (totalRecibido.compareTo(BigDecimal.ZERO) == 0) {
            nuevoEstado = Compra.EstadoCompra.pendiente;
        } else if (totalRecibido.compareTo(totalPedido) >= 0) {
            nuevoEstado = Compra.EstadoCompra.recibida;
        } else {
            nuevoEstado = Compra.EstadoCompra.parcial;
        }

        compra.setEstadoCompra(nuevoEstado);
        compraRepo.save(compra);
    }
}
