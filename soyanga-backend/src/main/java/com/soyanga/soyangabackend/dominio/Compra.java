package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "compras",
        indexes = {
                @Index(name = "idx_compras_proveedor_fecha", columnList = "id_proveedor, fecha_compra"),
                @Index(name = "idx_compras_estado", columnList = "estado_compra")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Compra {

    public enum EstadoCompra {
        pendiente, aprobada, enviada, parcial, recibida, anulada
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra")
    @EqualsAndHashCode.Include
    private Long idCompra;

    @Column(name = "id_proveedor", nullable = false)
    private Long idProveedor;

    @Column(name = "fecha_compra", nullable = false)
    private LocalDateTime fechaCompra;

    @Column(name = "id_moneda", nullable = false)
    private Long idMoneda;

    @Column(name = "tipo_cambio_usado", nullable = false, precision = 18, scale = 6)
    private BigDecimal tipoCambioUsado;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_compra", nullable = false, length = 20)
    private EstadoCompra estadoCompra;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
