package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "movimientos_de_inventario",
        indexes = {
                @Index(name = "idx_movimientos_fecha", columnList = "fecha_movimiento"),
                @Index(name = "idx_movimientos_lote", columnList = "id_lote"),
                @Index(name = "idx_movimientos_referencia", columnList = "referencia_modulo, id_referencia")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class MovimientoInventario {

    public enum TipoMovimiento {
        ingreso_compra, salida_venta, reserva_anticipo, liberacion_reserva,
        transferencia_salida, transferencia_ingreso, ajuste
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento")
    @EqualsAndHashCode.Include
    private Long idMovimiento;

    @Column(name = "fecha_movimiento", nullable = false)
    private LocalDateTime fechaMovimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false, length = 30)
    private TipoMovimiento tipoMovimiento;

    @Column(name = "id_almacen_origen")
    private Long idAlmacenOrigen;

    @Column(name = "id_almacen_destino")
    private Long idAlmacenDestino;

    @Column(name = "id_lote")
    private Long idLote;

    @Column(name = "cantidad", nullable = false, precision = 18, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "referencia_modulo", nullable = false, length = 30)
    private String referenciaModulo; // 'venta','compra','transferencia','anticipo','ajuste','recepcion'

    @Column(name = "id_referencia", nullable = false)
    private Long idReferencia;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
