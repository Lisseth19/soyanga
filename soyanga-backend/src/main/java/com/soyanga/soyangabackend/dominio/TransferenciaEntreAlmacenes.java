package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "transferencias_entre_almacenes",
        indexes = {
                @Index(name = "idx_transferencias_origen_destino", columnList = "id_almacen_origen, id_almacen_destino")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TransferenciaEntreAlmacenes {

    public enum EstadoTransferencia {
        pendiente, en_transito, completada, anulada
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transferencia")
    @EqualsAndHashCode.Include
    private Long idTransferencia;

    @Column(name = "fecha_transferencia", nullable = false)
    private LocalDateTime fechaTransferencia;

    @Column(name = "id_almacen_origen", nullable = false)
    private Long idAlmacenOrigen;

    @Column(name = "id_almacen_destino", nullable = false)
    private Long idAlmacenDestino;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_transferencia", nullable = false, length = 20)
    private EstadoTransferencia estadoTransferencia;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
