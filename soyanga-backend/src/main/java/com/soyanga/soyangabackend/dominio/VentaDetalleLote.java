package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "ventas_detalle_lotes",
        indexes = {
                @Index(name = "idx_venta_det_lotes_detalle", columnList = "id_venta_detalle"),
                @Index(name = "idx_venta_det_lotes_lote", columnList = "id_lote")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class VentaDetalleLote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta_detalle_lote")
    @EqualsAndHashCode.Include
    private Long idVentaDetalleLote;

    @Column(name = "id_venta_detalle", nullable = false)
    private Long idVentaDetalle;

    @Column(name = "id_lote", nullable = false)
    private Long idLote;

    @Column(name = "cantidad", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidad;
}
