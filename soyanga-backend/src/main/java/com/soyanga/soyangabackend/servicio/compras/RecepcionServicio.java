package com.soyanga.soyangabackend.servicio.compras;

import com.soyanga.soyangabackend.dominio.*;
import com.soyanga.soyangabackend.dto.compras.*;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.compras.*;
import com.soyanga.soyangabackend.repositorio.inventario.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Compra no encontrada: " + dto.getIdCompra()));

                if (dto.getItems() == null || dto.getItems().isEmpty()) {
                        throw new IllegalArgumentException("La recepción debe tener items");
                }

                var fecha = dto.getFechaRecepcion() != null ? dto.getFechaRecepcion() : LocalDateTime.now();

                // 1) Cabecera (inicia "registrada")
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

                // 2) Detalles + Lote + Existencia + Movimiento
                for (var it : dto.getItems()) {
                        var detCompra = compraDetRepo.findById(it.getIdCompraDetalle())
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Detalle de compra no encontrado: " + it.getIdCompraDetalle()));

                        if (!detCompra.getIdCompra().equals(compra.getIdCompra())) {
                                throw new IllegalArgumentException("El detalle " + it.getIdCompraDetalle()
                                                + " no pertenece a la compra " + compra.getIdCompra());
                        }
                        if (!detCompra.getIdPresentacion().equals(it.getIdPresentacion())) {
                                throw new IllegalArgumentException(
                                                "idPresentacion no coincide con el detalle de compra");
                        }

                        var yaRecibido = recepDetRepo.totalRecibidoActivoPorDetalle(it.getIdCompraDetalle());
                        var restante = detCompra.getCantidad().subtract(yaRecibido);
                        if (restante.compareTo(BigDecimal.ZERO) <= 0) {
                                throw new IllegalArgumentException("El detalle " + it.getIdCompraDetalle()
                                                + " ya fue recibido completamente");
                        }
                        if (it.getCantidadRecibida().compareTo(restante) > 0) {
                                throw new IllegalArgumentException("Cantidad recibida (" + it.getCantidadRecibida()
                                                + ") excede lo pendiente (" + restante + ") del detalle "
                                                + it.getIdCompraDetalle());
                        }
                        if (it.getFechaFabricacion() != null &&
                                        it.getFechaVencimiento() != null &&
                                        it.getFechaVencimiento().isBefore(it.getFechaFabricacion())) {
                                throw new IllegalArgumentException(
                                                "La fecha de vencimiento no puede ser anterior a la fabricación");
                        }

                        presentacionRepo.findById(it.getIdPresentacion())
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Presentación no encontrada: " + it.getIdPresentacion()));

                        var det = RecepcionDetalle.builder()
                                        .idRecepcion(cab.getIdRecepcion())
                                        .idCompraDetalle(it.getIdCompraDetalle())
                                        .idPresentacion(it.getIdPresentacion())
                                        .cantidadRecibida(it.getCantidadRecibida())
                                        .costoUnitarioMoneda(it.getCostoUnitarioMoneda())
                                        .observaciones(it.getObservaciones())
                                        .build();
                        det = recepDetRepo.save(det);

                        var lote = Lote.builder()
                                        .idRecepcionDetalle(det.getIdRecepcionDetalle())
                                        .idPresentacion(it.getIdPresentacion())
                                        .numeroLote(it.getNumeroLote().trim())
                                        .fechaFabricacion(it.getFechaFabricacion())
                                        .fechaVencimiento(it.getFechaVencimiento())
                                        .observaciones(it.getObservaciones())
                                        .build();
                        lote = loteRepo.save(lote);

                        final Long idAlmacen = dto.getIdAlmacen();
                        final Long idLote = lote.getIdLote();

                        var exOpt = existenciaRepo.lockByAlmacenAndIdLote(idAlmacen, idLote);
                        ExistenciaPorLote ex = exOpt.orElseGet(() -> ExistenciaPorLote.builder()
                                        .idAlmacen(idAlmacen)
                                        .idLote(idLote)
                                        .cantidadDisponible(BigDecimal.ZERO)
                                        .cantidadReservada(BigDecimal.ZERO)
                                        .stockMinimo(BigDecimal.ZERO)
                                        .build());

                        ex.setCantidadDisponible(ex.getCantidadDisponible().add(it.getCantidadRecibida()));
                        ex.setFechaUltimaActualizacion(LocalDateTime.now());
                        existenciaRepo.save(ex);

                        var mov = MovimientoInventario.builder()
                                        .fechaMovimiento(LocalDateTime.now())
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

                // 3) Recalcular estado de la compra y decidir si cerrar esta recepción
                var nuevoEstadoCompra = recomputarEstadoCompra(compra.getIdCompra()); // guarda y devuelve el enum

                if (nuevoEstadoCompra == Compra.EstadoCompra.recibida) {
                        cab.setEstadoRecepcion("cerrada");
                } else {
                        cab.setEstadoRecepcion("registrada"); // parcial o pendiente
                }
                recepRepo.save(cab);

                return RecepcionRespuestaDTO.builder()
                                .idRecepcion(cab.getIdRecepcion())
                                .estado(cab.getEstadoRecepcion())
                                .itemsCreados(creados)
                                .build();
        }

        @Transactional
        public void cerrar(Long idRecepcion) {
                var recep = recepRepo.findById(idRecepcion)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Recepción no encontrada: " + idRecepcion));

                if ("anulada".equalsIgnoreCase(recep.getEstadoRecepcion())) {
                        throw new IllegalArgumentException("No se puede cerrar una recepción anulada");
                }
                if (!"cerrada".equalsIgnoreCase(recep.getEstadoRecepcion())) {
                        recep.setEstadoRecepcion("cerrada");
                        recepRepo.save(recep);
                }

                // aunque cierres manualmente, actualiza el estado de la compra
                recomputarEstadoCompra(recep.getIdCompra());
        }

        /**
         * Suma cantidades recibidas (excluye recepciones anuladas), actualiza y
         * devuelve el estado de la compra.
         */
        private Compra.EstadoCompra recomputarEstadoCompra(Long idCompra) {
                var compra = compraRepo.findById(idCompra)
                                .orElseThrow(() -> new IllegalArgumentException("Compra no encontrada: " + idCompra));

                var dets = compraDetRepo.findByIdCompra(compra.getIdCompra());
                BigDecimal totalPedido = dets.stream()
                                .map(CompraDetalle::getCantidad)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                var recepciones = recepRepo.findByIdCompra(compra.getIdCompra());
                BigDecimal totalRecibido = BigDecimal.ZERO;

                for (var r : recepciones) {
                        if ("anulada".equalsIgnoreCase(r.getEstadoRecepcion()))
                                continue; // ignorar anuladas
                        var detsR = recepDetRepo.findByIdRecepcion(r.getIdRecepcion());
                        var suma = detsR.stream()
                                        .map(RecepcionDetalle::getCantidadRecibida)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                        totalRecibido = totalRecibido.add(suma);
                }

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
                return nuevoEstado;

        }

        @Transactional(readOnly = true)
        public List<RecepcionCabeceraDTO> listarCabeceras(Long compraId) {
                List<RecepcionPedido> recs = (compraId == null)
                                ? recepRepo.findAll()
                                : recepRepo.findByIdCompra(compraId);

                List<RecepcionCabeceraDTO> out = new ArrayList<>();
                for (var r : recs) {
                        out.add(new RecepcionCabeceraDTO(
                                        r.getIdRecepcion(),
                                        r.getIdCompra(),
                                        r.getFechaRecepcion(),
                                        r.getIdAlmacen(),
                                        r.getNumeroDocumentoProveedor(),
                                        r.getEstadoRecepcion(),
                                        r.getObservaciones()));
                }
                return out;
        }

        @Transactional(readOnly = true)
        public RecepcionDetalladaDTO obtenerDetallada(Long idRecepcion) {
                var r = recepRepo.findById(idRecepcion)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Recepción no encontrada: " + idRecepcion));

                var dets = recepDetRepo.findByIdRecepcion(r.getIdRecepcion());

                var items = new ArrayList<RecepcionItemDTO>();
                for (var d : dets) {
                        // Busca el lote de ese detalle (ajusta el método del repo si tu firma es
                        // distinta)
                        var loteOpt = loteRepo.findByIdRecepcionDetalle(d.getIdRecepcionDetalle());
                        var lote = loteOpt.orElse(null);

                        items.add(new RecepcionItemDTO(
                                        d.getIdRecepcionDetalle(),
                                        d.getIdCompraDetalle(),
                                        d.getIdPresentacion(),
                                        d.getCantidadRecibida(),
                                        d.getCostoUnitarioMoneda(),
                                        lote != null ? lote.getNumeroLote() : null,
                                        lote != null ? lote.getFechaFabricacion() : null,
                                        lote != null ? lote.getFechaVencimiento() : null,
                                        d.getObservaciones()));
                }

                return new RecepcionDetalladaDTO(
                                r.getIdRecepcion(),
                                r.getIdCompra(),
                                r.getFechaRecepcion(),
                                r.getIdAlmacen(),
                                r.getNumeroDocumentoProveedor(),
                                r.getEstadoRecepcion(),
                                r.getObservaciones(),
                                items);
        }

}
