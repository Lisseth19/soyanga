package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "precios_de_venta_historicos", indexes = {
        @Index(name = "idx_precios_hist_presentacion", columnList = "id_presentacion, fecha_inicio_vigencia")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PrecioVentaHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_precio_historico")
    @EqualsAndHashCode.Include
    private Long idPrecioHistorico;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "precio_venta_bob", nullable = false, precision = 18, scale = 6)
    private BigDecimal precioVentaBob;

    @Column(name = "fecha_inicio_vigencia", nullable = false)
    private LocalDateTime fechaInicioVigencia;

    @Column(name = "fecha_fin_vigencia")
    private LocalDateTime fechaFinVigencia;

    @Column(name = "motivo_cambio", columnDefinition = "text")
    private String motivoCambio;

    @Column(name = "usuario", columnDefinition = "text")
    private String usuario;

    /** Completa fecha de inicio si viene nula y valida el rango. */
    @PrePersist
    public void prePersist() {
        if (this.fechaInicioVigencia == null) {
            this.fechaInicioVigencia = LocalDateTime.now();
        }
        validarRangoFechas();
    }

    /** Valida el rango en updates. */
    @PreUpdate
    public void preUpdate() {
        // Por si en algún update alguien la deja nula accidentalmente
        if (this.fechaInicioVigencia == null) {
            this.fechaInicioVigencia = LocalDateTime.now();
        }
        validarRangoFechas();
    }

    /** No permitir fechaFin < fechaInicio (se permite igual o null). */
    private void validarRangoFechas() {
        if (this.fechaFinVigencia != null
                && this.fechaInicioVigencia != null
                && this.fechaFinVigencia.isBefore(this.fechaInicioVigencia)) {
            throw new IllegalStateException(
                    "fecha_fin_vigencia no puede ser anterior a fecha_inicio_vigencia");
        }
    }

    /**
     * Vigente = sin fechaFin. Si quisieras “vigente a una fecha”, pásala por
     * parámetro.
     */
    @JsonIgnore
    public boolean isVigente() {
        return this.fechaFinVigencia == null;
    }
}
