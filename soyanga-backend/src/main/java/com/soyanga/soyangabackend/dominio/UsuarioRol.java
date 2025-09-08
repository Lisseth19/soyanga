package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "usuarios_roles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_usuario_rol", columnNames = {"id_usuario", "id_rol"})
        },
        indexes = {
                @Index(name = "idx_usuarios_roles_usuario", columnList = "id_usuario"),
                @Index(name = "idx_usuarios_roles_rol", columnList = "id_rol")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class UsuarioRol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario_rol")
    @EqualsAndHashCode.Include
    private Long idUsuarioRol;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Column(name = "id_rol", nullable = false)
    private Long idRol;
}
