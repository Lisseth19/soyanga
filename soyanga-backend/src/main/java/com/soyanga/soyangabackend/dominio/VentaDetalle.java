package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "ventas_detalle",
        indexes = {
                @Index(name = "idx_venta_det_venta", columnList = "id_venta"),
                @Index(name = "idx_venta_det_presentacion", columnList = "id_presentacion")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class VentaDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta_detalle")
    @EqualsAndHashCode.Include
    private Long idVentaDetalle;

    @Column(name = "id_venta", nullable = false)
    private Long idVenta;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "cantidad", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario_bob", nullable = false, precision = 18, scale = 6)
    private BigDecimal precioUnitarioBob;

    @Column(name = "descuento_porcentaje", nullable = false, precision = 9, scale = 4)
    @Builder.Default
    private BigDecimal descuentoPorcentaje = BigDecimal.ZERO;

    @Column(name = "descuento_monto_bob", nullable = false, precision = 18, scale = 6)
    @Builder.Default
    private BigDecimal descuentoMontoBob = BigDecimal.ZERO;

    @Column(name = "subtotal_bob", nullable = false, precision = 18, scale = 6)
    @Builder.Default
    private BigDecimal subtotalBob = BigDecimal.ZERO;
}
