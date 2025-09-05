package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "unidades_de_medida")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class UnidadMedida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_unidad")
    @EqualsAndHashCode.Include
    private Long idUnidad;

    @Column(name = "nombre_unidad", nullable = false)
    private String nombreUnidad;

    @Column(name = "simbolo_unidad", nullable = false)
    private String simboloUnidad;

    @Column(name = "factor_conversion_base", nullable = false, precision = 18, scale = 6)
    private BigDecimal factorConversionBase;
}
