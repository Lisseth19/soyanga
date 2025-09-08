package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "pagos_recibidos",
        indexes = {
                @Index(name = "idx_pagos_cliente_fecha", columnList = "id_cliente, fecha_pago")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PagoRecibido {

    public enum MetodoDePago { efectivo, transferencia }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pago_recibido")
    @EqualsAndHashCode.Include
    private Long idPagoRecibido;

    @Column(name = "fecha_pago", nullable = false)
    private LocalDateTime fechaPago;

    @Column(name = "id_cliente")
    private Long idCliente; // ON DELETE SET NULL

    @Column(name = "id_moneda", nullable = false)
    private Long idMoneda;

    @Column(name = "monto_moneda", nullable = false, precision = 18, scale = 6)
    private BigDecimal montoMoneda;

    @Column(name = "monto_bob_equivalente", nullable = false, precision = 18, scale = 6)
    private BigDecimal montoBobEquivalente;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_de_pago", nullable = false, length = 20)
    private MetodoDePago metodoDePago;

    @Column(name = "referencia_externa", columnDefinition = "text")
    private String referenciaExterna;

    @Column(name = "aplica_a_cuenta", nullable = false)
    @Builder.Default
    private Boolean aplicaACuenta = true;
}
