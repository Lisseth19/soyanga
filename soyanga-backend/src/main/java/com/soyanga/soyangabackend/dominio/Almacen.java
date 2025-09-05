package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "almacenes",
        indexes = {
                @Index(name = "idx_almacenes_sucursal", columnList = "id_sucursal")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Almacen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_almacen")
    @EqualsAndHashCode.Include
    private Long idAlmacen;

    // FK como Long (estable para REST/React)
    @Column(name = "id_sucursal", nullable = false)
    private Long idSucursal;

    @Column(name = "nombre_almacen", nullable = false)
    private String nombreAlmacen;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "estado_activo", nullable = false)
    @Builder.Default
    private Boolean estadoActivo = true;
}
