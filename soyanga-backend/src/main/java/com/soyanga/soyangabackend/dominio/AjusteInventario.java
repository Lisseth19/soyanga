package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ajustes_inventario", indexes = {
        @Index(name = "ix_ajustes_req", columnList = "request_id"),
        @Index(name = "ix_ajustes_lote", columnList = "id_lote"),
        @Index(name = "ix_ajustes_almacen", columnList = "id_almacen")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AjusteInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ajuste")
    private Long idAjuste;

    @Column(name = "tipo", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private Tipo tipo; // INGRESO | EGRESO

    public enum Tipo {
        INGRESO, EGRESO
    }

    @Column(name = "id_almacen", nullable = false)
    private Long idAlmacen;

    @Column(name = "id_lote", nullable = false)
    private Long idLote;

    @Column(name = "cantidad", nullable = false, precision = 18, scale = 6)
    private BigDecimal cantidad;

    @Column(name = "motivo", nullable = false, length = 50)
    private String motivo;

    @Column(name = "observaciones")
    private String observaciones;

    @Column(name = "estado", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private Estado estado;

    public enum Estado {
        APLICADO, ANULADO
    }

    @Column(name = "creado_por", nullable = false)
    private Long creadoPor;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @Column(name = "aplicado_en")
    private LocalDateTime aplicadoEn;

    @Column(name = "request_id", nullable = false, unique = true)
    private UUID requestId;

    @Column(name = "id_movimiento")
    private Long idMovimiento; // vínculo al kardex (movimiento_de_inventario)
}
