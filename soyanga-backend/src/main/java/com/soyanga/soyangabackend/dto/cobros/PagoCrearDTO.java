package com.soyanga.soyangabackend.dto.cobros;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PagoCrearDTO {
    private LocalDateTime fechaPago;          // si null -> now

    private Long idCliente;                   // opcional
    @NotNull private Long idMoneda;           // usa el id de tu tabla monedas (BOB)
    @NotNull @DecimalMin("0.01")
    private BigDecimal montoMoneda;

    // Para simplificar: si idMoneda = BOB, se ignora y se iguala.
    // Si quieres usar tipos_de_cambio, lo hacemos luego.
    private BigDecimal montoBobEquivalente;   // opcional, si null y moneda=BOB => igual a montoMoneda

    @NotNull private String metodoDePago;     // 'efectivo' | 'transferencia'
    private String referenciaExterna;
    private Boolean aplicaACuenta = Boolean.TRUE;

    @Valid
    private List<Aplicacion> aplicaciones;    // requerido si aplicaACuenta = true

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Aplicacion {
        @NotNull private Long idCuentaCobrar;
        @NotNull @DecimalMin("0.01")
        private BigDecimal montoAplicadoBob;
    }
}
