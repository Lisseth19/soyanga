package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.CuentaPorCobrar;
import com.soyanga.soyangabackend.dominio.PagoRecibido;
import com.soyanga.soyangabackend.dominio.AplicacionPago;
import com.soyanga.soyangabackend.dto.cobros.PagoAplicarDTO;
import com.soyanga.soyangabackend.dto.cobros.PagoAplicarRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.PagoRecibidoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class PagoAplicacionServicio {

    private final PagoRecibidoRepositorio pagoRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;
    private final AplicacionPagoRepositorio aplRepo;

    @Transactional
    public PagoAplicarRespuestaDTO aplicar(Long idPago, PagoAplicarDTO dto) {
        var pago = pagoRepo.findById(idPago)
                .orElseThrow(() -> new IllegalArgumentException("Pago no encontrado: " + idPago));

        var detalle = new ArrayList<PagoAplicarRespuestaDTO.Linea>();
        BigDecimal totalAplicado = BigDecimal.ZERO;

        for (var it : dto.getItems()) {
            var cxc = cxcRepo.findById(it.getIdCuentaCobrar())
                    .orElseThrow(() -> new IllegalArgumentException("CXC no encontrada: " + it.getIdCuentaCobrar()));

            // Si el DTO trae idCliente, validar que la CxC pertenezca al mismo cliente
            if (dto.getIdCliente() != null) {
                var venta = cxcRepo.findVentaInfoByIdCxc(cxc.getIdCuentaCobrar())
                        .orElse(null);
                if (venta != null && venta.getIdCliente() != null &&
                        !venta.getIdCliente().equals(dto.getIdCliente())) {
                    throw new IllegalArgumentException("La CxC " + cxc.getIdCuentaCobrar() + " no pertenece al cliente indicado");
                }
            }

            if (it.getMontoAplicadoBob().compareTo(cxc.getMontoPendienteBob()) > 0) {
                throw new IllegalArgumentException("El monto aplicado excede el pendiente de la CxC " + cxc.getIdCuentaCobrar());
            }

            BigDecimal antes = cxc.getMontoPendienteBob();

            // Insert aplicación
            var apl = AplicacionPago.builder()
                    .idPagoRecibido(pago.getIdPagoRecibido())
                    .idCuentaCobrar(cxc.getIdCuentaCobrar())
                    .montoAplicadoBob(it.getMontoAplicadoBob())
                    .build();
            aplRepo.save(apl);

            // Actualizar CxC
            cxc.setMontoPendienteBob(cxc.getMontoPendienteBob().subtract(it.getMontoAplicadoBob()));
            if (cxc.getMontoPendienteBob().signum() == 0) {
                cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.pagado);
            } else {
                // si ya estaba vencido, mantenlo; si no, parcial
                if (cxc.getEstadoCuenta() != CuentaPorCobrar.EstadoCuenta.vencido) {
                    cxc.setEstadoCuenta(CuentaPorCobrar.EstadoCuenta.parcial);
                }
            }
            cxcRepo.save(cxc);

            detalle.add(PagoAplicarRespuestaDTO.Linea.builder()
                    .idCuentaCobrar(cxc.getIdCuentaCobrar())
                    .antes(antes)
                    .aplicado(it.getMontoAplicadoBob())
                    .despues(cxc.getMontoPendienteBob())
                    .estadoCxc(cxc.getEstadoCuenta().name())
                    .build());

            totalAplicado = totalAplicado.add(it.getMontoAplicadoBob());
        }

        // (Opcional) podrías marcar algo en el pago, ej. flag de “ya aplicado parcialmente” si quieres.
        pago.setFechaPago(pago.getFechaPago() != null ? pago.getFechaPago() : LocalDateTime.now());
        pagoRepo.save(pago);

        return PagoAplicarRespuestaDTO.builder()
                .idPago(pago.getIdPagoRecibido())
                .aplicaciones(detalle.size())
                .totalAplicado(totalAplicado)
                .detalle(detalle)
                .build();
    }
}
