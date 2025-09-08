package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "roles_permisos",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_rol_permiso", columnNames = {"id_rol", "id_permiso"})
        },
        indexes = {
                @Index(name = "idx_roles_permisos_rol", columnList = "id_rol"),
                @Index(name = "idx_roles_permisos_permiso", columnList = "id_permiso")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class RolPermiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol_permiso")
    @EqualsAndHashCode.Include
    private Long idRolPermiso;

    @Column(name = "id_rol", nullable = false)
    private Long idRol;

    @Column(name = "id_permiso", nullable = false)
    private Long idPermiso;
}
