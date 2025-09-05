package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "recepciones_detalle",
        indexes = {
                @Index(name = "idx_recep_det_recepcion", columnList = "id_recepcion"),
                @Index(name = "idx_recep_det_compra_detalle", columnList = "id_compra_detalle"),
                @Index(name = "idx_recep_det_presentacion", columnList = "id_presentacion")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class RecepcionDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_recepcion_detalle")
    @EqualsAndHashCode.Include
    private Long idRecepcionDetalle;

    @Column(name = "id_recepcion", nullable = false)
    private Long idRecepcion;

    @Column(name = "id_compra_detalle", nullable = false)
    private Long idCompraDetalle;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "cantidad_recibida", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidadRecibida;

    @Column(name = "costo_unitario_moneda", nullable = false, precision = 18, scale = 6)
    private BigDecimal costoUnitarioMoneda;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
