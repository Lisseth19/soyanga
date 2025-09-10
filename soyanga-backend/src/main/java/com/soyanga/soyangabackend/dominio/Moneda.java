package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "monedas",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_monedas_codigo", columnNames = {"codigo_moneda"})
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Moneda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_moneda")
    @EqualsAndHashCode.Include
    private Long idMoneda;

    @Column(name = "codigo_moneda", nullable = false)
    private String codigoMoneda; // BOB, USD, USDT

    @Column(name = "nombre_moneda", nullable = false)
    private String nombreMoneda;

    @Column(name = "es_moneda_local", nullable = false)
    @Builder.Default
    private Boolean esMonedaLocal = false;

    @Column(name = "estado_activo", nullable = false)
    private boolean estadoActivo = true;

}
