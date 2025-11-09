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

        // Puede venir null si el pago se creó sin cliente
        Long clientePago = pago.getIdCliente();

        for (var it : dto.getItems()) {
            var cxc = cxcRepo.findById(it.getIdCuentaCobrar())
                    .orElseThrow(() -> new IllegalArgumentException("CXC no encontrada: " + it.getIdCuentaCobrar()));

            // Cliente dueño de esta CxC (por la venta)
            var venta = cxcRepo.findVentaInfoByIdCxc(cxc.getIdCuentaCobrar()).orElse(null);
            Long clienteDeEstaCxc = (venta != null) ? venta.getIdCliente() : null;

            // Si el DTO trae idCliente, validar que la CxC pertenezca al mismo cliente
            if (dto.getIdCliente() != null && clienteDeEstaCxc != null
                    && !dto.getIdCliente().equals(clienteDeEstaCxc)) {
                throw new IllegalArgumentException("La CxC " + cxc.getIdCuentaCobrar() + " no pertenece al cliente indicado");
            }

            // Si el pago aún no tiene cliente, asígnalo desde la primera CxC aplicada
            if (clientePago == null && clienteDeEstaCxc != null) {
                pago.setIdCliente(clienteDeEstaCxc);
                clientePago = clienteDeEstaCxc;
            }

            // Si ya tiene cliente, validar consistencia
            if (clientePago != null && clienteDeEstaCxc != null
                    && !clientePago.equals(clienteDeEstaCxc)) {
                throw new IllegalArgumentException("El pago pertenece a un cliente distinto al de la CxC.");
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

        // Asegura fecha y guarda cambios del pago (incluye idCliente si se asignó arriba)
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
