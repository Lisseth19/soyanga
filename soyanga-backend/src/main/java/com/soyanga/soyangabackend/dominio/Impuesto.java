package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "impuestos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Impuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_impuesto")
    @EqualsAndHashCode.Include
    private Long idImpuesto;

    @Column(name = "nombre_impuesto", nullable = false)
    private String nombreImpuesto;

    @Column(name = "porcentaje", nullable = false, precision = 9, scale = 4)
    private BigDecimal porcentaje;

    @Column(name = "estado_activo", nullable = false)
    @Builder.Default
    private Boolean estadoActivo = true;
}
