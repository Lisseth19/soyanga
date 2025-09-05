package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "codigos_de_barras",
        indexes = {
                @Index(name = "idx_codigos_barras_codigo", columnList = "codigo_barras")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cod_barras_presentacion_codigo",
                        columnNames = {"id_presentacion", "codigo_barras"}
                )
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CodigoBarras {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_codigo_barras")
    @EqualsAndHashCode.Include
    private Long idCodigoBarras;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "codigo_barras", nullable = false)
    private String codigoBarras;

    @Column(name = "descripcion")
    private String descripcion;
}
