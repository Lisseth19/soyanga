// com.soyanga.soyangabackend.dominio.ConfiguracionPrecios.java
package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "configuracion_precios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfiguracionPrecios {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_config")
    private Long id;

    @Column(name = "modo_redondeo", nullable = false)
    private String modo;

    @Column(name = "multiplo", precision = 18, scale = 6)
    private BigDecimal multiplo;

    @Column(name = "decimales")
    private Integer decimales;

    @Column(name = "actualizado_por")
    private String actualizadoPor;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;
}
