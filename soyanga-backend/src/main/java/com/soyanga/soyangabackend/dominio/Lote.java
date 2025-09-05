package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "lotes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_lotes_recepcion_numero", columnNames = {"id_recepcion_detalle", "numero_lote"})
        },
        indexes = {
                @Index(name = "idx_lotes_recepcion_detalle", columnList = "id_recepcion_detalle"),
                @Index(name = "idx_lotes_vencimiento", columnList = "fecha_vencimiento")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Lote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_lote")
    @EqualsAndHashCode.Include
    private Long idLote;

    @Column(name = "id_recepcion_detalle", nullable = false)
    private Long idRecepcionDetalle;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "numero_lote", nullable = false)
    private String numeroLote;

    @Column(name = "fecha_fabricacion")
    private LocalDate fechaFabricacion;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
