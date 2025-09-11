package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "existencias_por_lote",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_existencia_almacen_lote", columnNames = {"id_almacen", "id_lote"})
        },
        indexes = {
                @Index(name = "idx_existencias_almacen", columnList = "id_almacen"),
                @Index(name = "idx_existencias_lote", columnList = "id_lote")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ExistenciaPorLote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_existencia_lote")
    @EqualsAndHashCode.Include
    private Long idExistenciaLote;

    @Column(name = "id_almacen", nullable = false)
    private Long idAlmacen;

    @Column(name = "id_lote", nullable = false)
    private Long idLote;

    @Column(name = "cantidad_disponible", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidadDisponible;

    @Column(name = "cantidad_reservada", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidadReservada;

    @Column(name = "stock_minimo", nullable = false, precision = 18, scale = 3)
    private BigDecimal stockMinimo;

    @Column(name = "fecha_ultima_actualizacion", nullable = false)
    private LocalDateTime fechaUltimaActualizacion;
    @PrePersist
    public void prePersist() {
        if (fechaUltimaActualizacion == null) {
            fechaUltimaActualizacion = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        fechaUltimaActualizacion = LocalDateTime.now();
    }
}
