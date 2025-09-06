package com.soyanga.soyangabackend.servicio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionPago;
import com.soyanga.soyangabackend.dominio.CuentaPorCobrar;
import com.soyanga.soyangabackend.dominio.PagoRecibido;
import com.soyanga.soyangabackend.dto.cobros.PagoCrearDTO;
import com.soyanga.soyangabackend.dto.cobros.PagoRespuestaDTO;
import com.soyanga.soyangabackend.repositorio.cobros.AplicacionPagoRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.CuentaPorCobrarRepositorio;
import com.soyanga.soyangabackend.repositorio.cobros.PagoRecibidoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.soyanga.soyangabackend.dominio.CuentaPorCobrar.EstadoCuenta;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class PagoServicio {

    private final PagoRecibidoRepositorio pagoRepo;
    private final AplicacionPagoRepositorio aplRepo;
    private final CuentaPorCobrarRepositorio cxcRepo;

    @Transactional
    public PagoRespuestaDTO registrar(PagoCrearDTO dto) {
        var fecha = dto.getFechaPago() != null ? dto.getFechaPago() : LocalDateTime.now();

        BigDecimal eqBob = dto.getMontoBobEquivalente();
        if (eqBob == null) {
            // si usas solo BOB por ahora, igualamos
            eqBob = dto.getMontoMoneda();
        }

        // 🔹 convertir String -> Enum (case-insensitive, mensajes claros)
        var metodoEnum = parseMetodo(dto.getMetodoDePago());

        var pago = PagoRecibido.builder()
                .fechaPago(fecha)
                .idCliente(dto.getIdCliente())
                .idMoneda(dto.getIdMoneda())
                .montoMoneda(dto.getMontoMoneda())
                .montoBobEquivalente(eqBob)
                .metodoDePago(metodoEnum)                  // <-- enum aquí
                .referenciaExterna(dto.getReferenciaExterna())
                .aplicaACuenta(dto.getAplicaACuenta() != null ? dto.getAplicaACuenta() : Boolean.TRUE)
                .build();
        pago = pagoRepo.save(pago);

        var cxcAfectadas = new ArrayList<Long>();
        boolean aplicado = false;

        if (Boolean.TRUE.equals(pago.getAplicaACuenta())) {
            if (dto.getAplicaciones() == null || dto.getAplicaciones().isEmpty()) {
                throw new IllegalArgumentException("Debe enviar aplicaciones cuando aplicaACuenta = true");
            }

            // opcional: validar suma de aplicaciones <= eqBob
            BigDecimal sumaApps = dto.getAplicaciones().stream()
                    .map(PagoCrearDTO.Aplicacion::getMontoAplicadoBob)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sumaApps.compareTo(eqBob) > 0) {
                throw new IllegalArgumentException("La suma de aplicaciones excede el monto del pago en BOB");
            }

            for (var a : dto.getAplicaciones()) {
                var cxc = cxcRepo.findById(a.getIdCuentaCobrar())
                        .orElseThrow(() -> new IllegalArgumentException("CXC no encontrada: " + a.getIdCuentaCobrar()));

                // aplicar
                BigDecimal nuevoPendiente = cxc.getMontoPendienteBob().subtract(a.getMontoAplicadoBob());
                if (nuevoPendiente.compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalArgumentException("Aplicación excede el pendiente de la CxC " + cxc.getIdCuentaCobrar());
                }

                cxc.setMontoPendienteBob(nuevoPendiente);
                if (nuevoPendiente.compareTo(BigDecimal.ZERO) == 0) {
                    cxc.setEstadoCuenta(EstadoCuenta.pagado);  // antes: "pagado"
                } else {
                    cxc.setEstadoCuenta(EstadoCuenta.parcial); // antes: "parcial"
                }
                cxcRepo.save(cxc);

                var apl = AplicacionPago.builder()
                        .idPagoRecibido(pago.getIdPagoRecibido())
                        .idCuentaCobrar(cxc.getIdCuentaCobrar())
                        .montoAplicadoBob(a.getMontoAplicadoBob())
                        .build();
                aplRepo.save(apl);

                cxcAfectadas.add(cxc.getIdCuentaCobrar());
                aplicado = true;
            }
        }

        return PagoRespuestaDTO.builder()
                .idPagoRecibido(pago.getIdPagoRecibido())
                .montoBobEquivalente(eqBob)
                .aplicado(aplicado)
                .cxcAfectadas(cxcAfectadas)
                .build();
    }
    private PagoRecibido.MetodoDePago parseMetodo(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("metodoDePago es requerido (efectivo/transferencia)");
        }
        return Arrays.stream(PagoRecibido.MetodoDePago.values())
                .filter(m -> m.name().equalsIgnoreCase(raw.trim()))
                .findFirst()
                .orElseThrow(() ->
                        new IllegalArgumentException("metodoDePago inválido: " + raw +
                                ". Valores válidos: efectivo, transferencia"));
    }
}
