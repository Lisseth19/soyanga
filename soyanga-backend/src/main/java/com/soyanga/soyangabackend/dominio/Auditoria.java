package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "auditorias",
        indexes = {
                @Index(name = "idx_auditorias_fecha", columnList = "fecha_evento"),
                @Index(name = "idx_auditorias_usuario", columnList = "id_usuario")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria")
    @EqualsAndHashCode.Include
    private Long idAuditoria;

    @Column(name = "fecha_evento", nullable = false)
    private LocalDateTime fechaEvento;

    @Column(name = "id_usuario")
    private Long idUsuario; // ON DELETE SET NULL

    @Column(name = "modulo_afectado", nullable = false)
    private String moduloAfectado;

    @Column(name = "accion", nullable = false)
    private String accion; // crear, editar, eliminar, anular, login, etc.

    @Column(name = "id_registro_afectado")
    private Long idRegistroAfectado;

    @Column(name = "detalle", columnDefinition = "text")
    private String detalle;
}
