package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "transferencias_detalle",
        indexes = {
                @Index(name = "idx_trans_det_transferencia", columnList = "id_transferencia"),
                @Index(name = "idx_trans_det_lote", columnList = "id_lote")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TransferenciaDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_transferencia_detalle")
    @EqualsAndHashCode.Include
    private Long idTransferenciaDetalle;

    @Column(name = "id_transferencia", nullable = false)
    private Long idTransferencia;

    @Column(name = "id_lote", nullable = false)
    private Long idLote;

    @Column(name = "cantidad", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidad;
}
