package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.dominio.AplicacionAnticipo;
import com.soyanga.soyangabackend.dominio.CuentaPorCobrar;
import com.soyanga.soyangabackend.dto.cobros.AplicarAnticipoDTO;
import com.soyanga.soyangabackend.dto.cobros.AplicarAnticipoRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.cobros.AnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionAnticipoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.ventas.VentaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AnticipoAplicacionServicio {

    private final AnticipoRepositorio anticipoRepo;
    private final AplicacionAnticipoRepositorio aplicacionRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;
    private final VentaRepositorio ventaRepo;

    @Transactional
    public AplicarAnticipoRespuestaDTO aplicar(Long idAnticipo, AplicarAnticipoDTO dto) {
        var anticipo = anticipoRepo.findById(idAnticipo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anticipo no encontrado: " + idAnticipo));

        // No se puede aplicar un anticipo anulado
        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El anticipo está anulado");
        }

        var venta = ventaRepo.findById(dto.getIdVenta())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada: " + dto.getIdVenta()));

        // Validar que el anticipo pertenezca al mismo cliente de la venta
        if (!Objects.equals(anticipo.getIdCliente(), venta.getIdCliente())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El anticipo pertenece a otro cliente");
        }

        // Debe existir CxC (venta a crédito) para aplicar
        var cxc = cxcRepo.findByIdVenta(venta.getIdVenta())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "La venta no es a crédito o no tiene CxC"));

        // Total histórico aplicado a este anticipo
        BigDecimal aplicadoHist = aplicacionRepo.totalAplicadoPorAnticipo(idAnticipo);
        if (aplicadoHist == null) aplicadoHist = BigDecimal.ZERO;

        BigDecimal saldoAnticipoAntes = anticipo.getMontoBob().subtract(aplicadoHist);

        // Validaciones de monto
        BigDecimal monto = dto.getMontoAplicadoBob();
        if (monto == null || monto.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El monto a aplicar debe ser mayor que 0");
        }
        if (monto.compareTo(saldoAnticipoAntes) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Saldo del anticipo insuficiente. Saldo: " + saldoAnticipoAntes);
        }
        if (monto.compareTo(cxc.getMontoPendienteBob()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Monto excede el pendiente de la CxC. Pendiente: " + cxc.getMontoPendienteBob());
        }

        // Registrar la aplicación
        var apl = AplicacionAnticipo.builder()
                .idAnticipo(idAnticipo)
                .idVenta(venta.getIdVenta())
                .montoAplicadoBob(monto)
                .fechaAplicacion(LocalDateTime.now())
                .build();
        apl = aplicacionRepo.save(apl);

        // Actualizar CxC
        BigDecimal cxcPendienteAntes = cxc.getMontoPendienteBob();
        cxc.setMontoPendienteBob(cxcPendienteAntes.subtract(monto));
        if (cxc.getMontoPendienteBob().signum() == 0) {
            cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.pagado);
        } else if (cxc.getEstadoCuenta() != CuentaPorCobrar.EstadoCuenta.vencido) {
            cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.parcial);
        }
        cxcRepo.save(cxc);

        // Recalcular estado del anticipo
        BigDecimal saldoAnticipoDespues = saldoAnticipoAntes.subtract(monto);
        Anticipo.EstadoAnticipo nuevoEstado;
        if (saldoAnticipoDespues.signum() == 0) {
            nuevoEstado = Anticipo.EstadoAnticipo.aplicado_total;
        } else {
            // Si aún hay saldo y ya estaba "transferido_a_venta", preservamos ese estado;
            // de lo contrario, "parcialmente_aplicado".
            nuevoEstado = (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.transferido_a_venta)
                    ? Anticipo.EstadoAnticipo.transferido_a_venta
                    : Anticipo.EstadoAnticipo.parcialmente_aplicado;
        }
        if (anticipo.getEstadoAnticipo() != nuevoEstado) {
            anticipo.setEstadoAnticipo(nuevoEstado);
            anticipoRepo.save(anticipo);
        } else {
            // igual persistimos si no cambió por si hay listeners/auditoría
            anticipoRepo.save(anticipo);
        }

        return AplicarAnticipoRespuestaDTO.builder()
                .idAplicacionAnticipo(apl.getIdAplicacionAnticipo())
                .idAnticipo(idAnticipo)
                .idVenta(venta.getIdVenta())
                .montoAplicadoBob(monto)
                .fechaAplicacion(apl.getFechaAplicacion())
                .saldoAnticipoAntes(saldoAnticipoAntes)
                .saldoAnticipoDespues(saldoAnticipoDespues)
                .cxcPendienteAntes(cxcPendienteAntes)
                .cxcPendienteDespues(cxc.getMontoPendienteBob())
                .estadoAnticipo(anticipo.getEstadoAnticipo().name())
                .estadoCxc(cxc.getEstadoCuenta().name())
                .build();
    }
}
