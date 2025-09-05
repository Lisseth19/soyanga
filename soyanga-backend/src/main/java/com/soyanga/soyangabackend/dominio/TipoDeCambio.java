package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "tipos_de_cambio",
        indexes = {
                @Index(name = "idx_tc_monedas_fecha", columnList = "id_moneda_origen, id_moneda_destino, fecha_vigencia")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TipoDeCambio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_cambio")
    @EqualsAndHashCode.Include
    private Long idTipoCambio;

    @Column(name = "id_moneda_origen", nullable = false)
    private Long idMonedaOrigen;

    @Column(name = "id_moneda_destino", nullable = false)
    private Long idMonedaDestino;

    @Column(name = "fecha_vigencia", nullable = false)
    private LocalDate fechaVigencia;

    @Column(name = "tasa_cambio", nullable = false, precision = 18, scale = 6)
    private BigDecimal tasaCambio;
}
