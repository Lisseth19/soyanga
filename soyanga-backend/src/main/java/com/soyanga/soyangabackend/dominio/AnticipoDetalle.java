package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "anticipos_detalle",
        indexes = {
                @Index(name = "idx_anticipo_det_anticipo", columnList = "id_anticipo")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AnticipoDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_anticipo_detalle")
    @EqualsAndHashCode.Include
    private Long idAnticipoDetalle;

    @Column(name = "id_anticipo", nullable = false)
    private Long idAnticipo;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "cantidad_reservada", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidadReservada;
}
