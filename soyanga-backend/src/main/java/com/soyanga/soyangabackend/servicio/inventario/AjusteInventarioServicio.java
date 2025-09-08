package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dominio.ExistenciaPorLote;
import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.dto.inventario.AjusteCrearDTO;
import com.soyanga.soyangabackend.dto.inventario.AjusteRespuestaDTO;
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

    @Transactional
    public AjusteRespuestaDTO ingreso(AjusteCrearDTO dto) {
        return registrarAjuste(dto, true);
    }

    @Transactional
    public AjusteRespuestaDTO salida(AjusteCrearDTO dto) {
        return registrarAjuste(dto, false);
    }

    private AjusteRespuestaDTO registrarAjuste(AjusteCrearDTO dto, boolean esIngreso) {
        if (dto.getCantidad() == null || dto.getCantidad().signum() <= 0) {
            throw new IllegalArgumentException("cantidad debe ser > 0");
        }

        var exOpt = existenciaRepo.lockByAlmacenAndIdLote(dto.getIdAlmacen(), dto.getIdLote());
        var ex = exOpt.orElseGet(() -> {
            if (!esIngreso) {
                throw new IllegalStateException("No existe stock para salida en almacén=" + dto.getIdAlmacen()
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

        if (esIngreso) {
            ex.setCantidadDisponible(antes.add(dto.getCantidad()));
        } else {
            if (antes.compareTo(dto.getCantidad()) < 0) {
                throw new IllegalStateException("Stock insuficiente: disponible=" + antes + ", solicitado=" + dto.getCantidad());
            }
            ex.setCantidadDisponible(antes.subtract(dto.getCantidad()));
        }
        ex.setFechaUltimaActualizacion(LocalDateTime.now());
        existenciaRepo.save(ex);

        // Movimiento kardex (tipo=ajuste). Convención usada: positivo=ingreso, negativo=salida.
        var cantidadMov = esIngreso ? dto.getCantidad() : dto.getCantidad().negate();

        var mov = MovimientoInventario.builder()
                .fechaMovimiento(LocalDateTime.now())
                .tipoMovimiento(MovimientoInventario.TipoMovimiento.ajuste)
                .idAlmacenOrigen(esIngreso ? null : dto.getIdAlmacen())
                .idAlmacenDestino(esIngreso ? dto.getIdAlmacen() : null)
                .idLote(dto.getIdLote())
                .cantidad(cantidadMov)
                .referenciaModulo("ajuste")
                .idReferencia(0L) // si luego quieres vincular a una tabla de “ajustes”, cámbialo aquí
                .observaciones(dto.getObservaciones() != null ? dto.getObservaciones()
                        : (esIngreso ? "Ajuste de ingreso" : "Ajuste de salida"))
                .build();
        mov = movRepo.save(mov);

        return AjusteRespuestaDTO.builder()
                .idMovimiento(mov.getIdMovimiento())
                .tipo(esIngreso ? "ingreso" : "salida")
                .idAlmacen(dto.getIdAlmacen())
                .idLote(dto.getIdLote())
                .cantidadAjustada(cantidadMov)
                .cantidadAnterior(antes)
                .cantidadNueva(ex.getCantidadDisponible())
                .fechaMovimiento(mov.getFechaMovimiento())
                .observaciones(mov.getObservaciones())
                .build();
    }
}
