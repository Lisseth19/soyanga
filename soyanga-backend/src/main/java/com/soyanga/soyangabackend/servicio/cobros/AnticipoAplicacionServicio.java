package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import com.soyanga.soyangabackend.dominio.AplicacionAnticipo; // <-- tu entidad (si se llama distinto, ajusta el import)
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

        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El anticipo está anulado");
        }

        var venta = ventaRepo.findById(dto.getIdVenta())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada: " + dto.getIdVenta()));

        if (!Objects.equals(anticipo.getIdCliente(), venta.getIdCliente())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El anticipo pertenece a otro cliente");
        }

        var cxc = cxcRepo.findByIdVenta(venta.getIdVenta())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "La venta no es a crédito o no tiene CxC"));

        BigDecimal aplicadoHist = aplicacionRepo.totalAplicadoPorAnticipo(idAnticipo);
        if (aplicadoHist == null) aplicadoHist = BigDecimal.ZERO;

        BigDecimal saldoAnticipoAntes = anticipo.getMontoBob().subtract(aplicadoHist);

        // ✅ NUEVO: validar monto
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

        var apl = AplicacionAnticipo.builder()
                .idAnticipo(idAnticipo)
                .idVenta(venta.getIdVenta())
                .montoAplicadoBob(monto) // usar la variable
                .fechaAplicacion(LocalDateTime.now())
                .build();
        apl = aplicacionRepo.save(apl);

        BigDecimal cxcPendienteAntes = cxc.getMontoPendienteBob();
        cxc.setMontoPendienteBob(cxcPendienteAntes.subtract(monto));
        if (cxc.getMontoPendienteBob().signum() == 0) {
            cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.pagado);
        } else if (cxc.getEstadoCuenta() != CuentaPorCobrar.EstadoCuenta.vencido) {
            cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.parcial);
        }
        cxcRepo.save(cxc);

        BigDecimal saldoAnticipoDespues = saldoAnticipoAntes.subtract(monto);
        anticipo.setEstadoAnticipo(
                saldoAnticipoDespues.signum() == 0
                        ? Anticipo.EstadoAnticipo.aplicado_total
                        : Anticipo.EstadoAnticipo.parcialmente_aplicado
        );
        anticipoRepo.save(anticipo);

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