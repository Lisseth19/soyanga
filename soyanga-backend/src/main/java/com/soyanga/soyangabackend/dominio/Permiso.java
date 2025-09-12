package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "permisos",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_permisos_nombre", columnNames = {"nombre_permiso"})
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Permiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_permiso")
    @EqualsAndHashCode.Include
    private Long idPermiso;

    @Column(name = "nombre_permiso", nullable = false)
    private String nombrePermiso;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "estado_activo", nullable = false)
    private Boolean estadoActivo = true; // default en Java, además del default en DB

    @PrePersist
    public void prePersist() {
        if (estadoActivo == null) estadoActivo = true;
    }
}
