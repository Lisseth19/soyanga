package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;

import java.math.BigDecimal;

@Entity
@Table(
        name = "anticipos_detalle",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_antdet_anticipo_presentacion_almacen",
                        columnNames = {"id_anticipo", "id_presentacion", "id_almacen"}
                )
        }
)
@Check(constraints = "cantidad_solicitada >= 0 AND cantidad_reservada >= 0 AND cantidad_solicitada >= cantidad_reservada")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "idAnticipoDetalle")
public class AnticipoDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_anticipo_detalle")
    private Long idAnticipoDetalle;

    @Column(name = "id_anticipo", nullable = false)
    private Long idAnticipo;

    @Column(name = "id_presentacion", nullable = false)
    private Long idPresentacion;

    @Column(name = "id_almacen", nullable = false)
    private Long idAlmacen;

    /** Cantidad pedida por el cliente (puede ser > reservada si no hay stock). */
    @Builder.Default
    @Column(name = "cantidad_solicitada", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidadSolicitada = BigDecimal.ZERO;

    /** Cantidad efectivamente reservada (bloquea stock). */
    @Builder.Default
    @Column(name = "cantidad_reservada", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidadReservada = BigDecimal.ZERO;

    /* ===== Helpers de dominio (opcionales) ===== */

    public void sumarSolicitada(BigDecimal qty) {
        if (qty == null) return;
        this.cantidadSolicitada = notNull(this.cantidadSolicitada).add(qty);
        sane();
    }

    public void sumarReservada(BigDecimal qty) {
        if (qty == null) return;
        this.cantidadReservada = notNull(this.cantidadReservada).add(qty);
        sane();
    }

    public void restarReservada(BigDecimal qty) {
        if (qty == null) return;
        this.cantidadReservada = notNull(this.cantidadReservada).subtract(qty);
        sane();
    }

    private static BigDecimal notNull(BigDecimal x) {
        return x == null ? BigDecimal.ZERO : x;
    }

    /** Asegura: no negativos y solicitada >= reservada */
    private void sane() {
        if (this.cantidadSolicitada == null) this.cantidadSolicitada = BigDecimal.ZERO;
        if (this.cantidadReservada == null) this.cantidadReservada = BigDecimal.ZERO;

        if (this.cantidadReservada.signum() < 0) this.cantidadReservada = BigDecimal.ZERO;
        if (this.cantidadSolicitada.signum() < 0) this.cantidadSolicitada = BigDecimal.ZERO;

        if (this.cantidadSolicitada.compareTo(this.cantidadReservada) < 0) {
            // forzamos la invariantes en memoria; el CHECK en DB también lo asegura
            this.cantidadSolicitada = this.cantidadReservada;
        }
    }
}
