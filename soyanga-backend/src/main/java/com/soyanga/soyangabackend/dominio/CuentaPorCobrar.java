package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "cuentas_por_cobrar",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_cxc_venta", columnNames = {"id_venta"})
        },
        indexes = {
                @Index(name = "idx_cxc_vencimiento", columnList = "fecha_vencimiento")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CuentaPorCobrar {

    public enum EstadoCuenta { pendiente, parcial, pagado, vencido }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cuenta_cobrar")
    @EqualsAndHashCode.Include
    private Long idCuentaCobrar;

    @Column(name = "id_venta", nullable = false)
    private Long idVenta;

    @Column(name = "monto_pendiente_bob", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoPendienteBob;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDate fechaEmision;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_cuenta", nullable = false, length = 20)
    private EstadoCuenta estadoCuenta;
}
