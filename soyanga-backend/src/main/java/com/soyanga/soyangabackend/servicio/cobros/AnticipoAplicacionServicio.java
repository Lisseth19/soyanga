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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
                .orElseThrow(() -> new IllegalArgumentException("Anticipo no encontrado: " + idAnticipo));

        // Enums: usar comparación por identidad
        if (anticipo.getEstadoAnticipo() == Anticipo.EstadoAnticipo.anulado) {
            throw new IllegalArgumentException("El anticipo está anulado");
        }

        var venta = ventaRepo.findById(dto.getIdVenta())
                .orElseThrow(() -> new IllegalArgumentException("Venta no encontrada: " + dto.getIdVenta()));

        // Debe existir CxC (venta crédito) para aplicar
        var cxc = cxcRepo.findByIdVenta(venta.getIdVenta())
                .orElseThrow(() -> new IllegalArgumentException("La venta no es a crédito o no tiene CxC"));

        // Total histórico aplicado a este anticipo
        BigDecimal aplicadoHist = aplicacionRepo.totalAplicadoPorAnticipo(idAnticipo);
        if (aplicadoHist == null) aplicadoHist = BigDecimal.ZERO; // por si acaso

        BigDecimal saldoAnticipoAntes = anticipo.getMontoBob().subtract(aplicadoHist);

        if (dto.getMontoAplicadoBob().compareTo(saldoAnticipoAntes) > 0) {
            throw new IllegalArgumentException("Saldo del anticipo insuficiente. Saldo: " + saldoAnticipoAntes);
        }
        if (dto.getMontoAplicadoBob().compareTo(cxc.getMontoPendienteBob()) > 0) {
            throw new IllegalArgumentException("Monto excede el pendiente de la CxC. Pendiente: " + cxc.getMontoPendienteBob());
        }

        BigDecimal cxcPendienteAntes = cxc.getMontoPendienteBob();

        // 1) Insert aplicación
        var apl = AplicacionAnticipo.builder()
                .idAnticipo(idAnticipo)
                .idVenta(venta.getIdVenta())
                .montoAplicadoBob(dto.getMontoAplicadoBob())
                .fechaAplicacion(LocalDateTime.now())
                .build();
        apl = aplicacionRepo.save(apl);

        // 2) Actualizar CxC (usando enums)
        cxc.setMontoPendienteBob(cxc.getMontoPendienteBob().subtract(dto.getMontoAplicadoBob()));
        if (cxc.getMontoPendienteBob().signum() == 0) {
            cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.pagado);
        } else {
            // si ya estaba vencido, mantener; sino, parcial
            if (cxc.getEstadoCuenta() != CuentaPorCobrar.EstadoCuenta.vencido) {
                cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.parcial);
            }
        }
        cxcRepo.save(cxc);

        // 3) Actualizar estado del anticipo (enum)
        BigDecimal aplicadoNuevo = aplicadoHist.add(dto.getMontoAplicadoBob());
        BigDecimal saldoAnticipoDespues = anticipo.getMontoBob().subtract(aplicadoNuevo);

        if (saldoAnticipoDespues.signum() == 0) {
            anticipo.setEstadoAnticipo(Anticipo.EstadoAnticipo.aplicado_total);
        } else {
            anticipo.setEstadoAnticipo(Anticipo.EstadoAnticipo.parcialmente_aplicado);
        }
        anticipoRepo.save(anticipo);

        return AplicarAnticipoRespuestaDTO.builder()
                .idAplicacionAnticipo(apl.getIdAplicacionAnticipo())
                .idAnticipo(idAnticipo)
                .idVenta(venta.getIdVenta())
                .montoAplicadoBob(dto.getMontoAplicadoBob())
                .fechaAplicacion(apl.getFechaAplicacion())
                .saldoAnticipoAntes(saldoAnticipoAntes)
                .saldoAnticipoDespues(saldoAnticipoDespues)
                .cxcPendienteAntes(cxcPendienteAntes)
                .cxcPendienteDespues(cxc.getMontoPendienteBob())
                .estadoAnticipo(anticipo.getEstadoAnticipo().name()) // String en DTO
                .estadoCxc(cxc.getEstadoCuenta().name())             // String en DTO
                .build();
    }
}
