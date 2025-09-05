package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "compras_detalle",
        indexes = {
                @Index(name = "idx_comp_det_compra", columnList = "id_compra"),
                @Index(name = "idx_comp_det_presentacion", columnList = "id_presentacion")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CompraDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra_detalle")
    @EqualsAndHashCode.Include
    private Long idCompraDetalle;

    @Column(name = "id_compra", nullable = false)
    private Long idCompra;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "cantidad", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "costo_unitario_moneda", nullable = false, precision = 18, scale = 6)
    private BigDecimal costoUnitarioMoneda;

    @Column(name = "fecha_estimada_recepcion")
    private LocalDate fechaEstimadaRecepcion;
}
