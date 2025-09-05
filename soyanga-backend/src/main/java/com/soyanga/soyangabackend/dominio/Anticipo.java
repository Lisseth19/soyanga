package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "anticipos",
        indexes = {
                @Index(name = "idx_anticipos_cliente_fecha", columnList = "id_cliente, fecha_anticipo")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Anticipo {

    public enum EstadoAnticipo {
        registrado, parcialmente_aplicado, aplicado_total, anulado
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_anticipo")
    @EqualsAndHashCode.Include
    private Long idAnticipo;

    @Column(name = "fecha_anticipo", nullable = false)
    private LocalDateTime fechaAnticipo;

    @Column(name = "id_cliente", nullable = false)
    private Long idCliente;

    @Column(name = "monto_bob", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoBob;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anticipo", nullable = false, length = 30)
    private EstadoAnticipo estadoAnticipo;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
