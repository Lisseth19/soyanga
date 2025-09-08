package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "aplicaciones_de_anticipo",
        indexes = {
                @Index(name = "idx_apl_anticipo_anticipo", columnList = "id_anticipo"),
                @Index(name = "idx_apl_anticipo_venta", columnList = "id_venta")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AplicacionAnticipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_aplicacion_anticipo")
    @EqualsAndHashCode.Include
    private Long idAplicacionAnticipo;

    @Column(name = "id_anticipo", nullable = false)
    private Long idAnticipo;

    @Column(name = "id_venta", nullable = false)
    private Long idVenta;

    @Column(name = "monto_aplicado_bob", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoAplicadoBob;

    @Column(name = "fecha_aplicacion", nullable = false)
    private LocalDateTime fechaAplicacion;
}
