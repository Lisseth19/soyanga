package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "recepciones_de_pedido",
        indexes = {
                @Index(name = "idx_recepciones_compra_fecha", columnList = "id_compra, fecha_recepcion"),
                @Index(name = "idx_recepciones_almacen", columnList = "id_almacen")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class RecepcionPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_recepcion")
    @EqualsAndHashCode.Include
    private Long idRecepcion;

    @Column(name = "id_compra", nullable = false)
    private Long idCompra;

    @Column(name = "fecha_recepcion", nullable = false)
    private LocalDateTime fechaRecepcion;

    @Column(name = "id_almacen", nullable = false)
    private Long idAlmacen;

    @Column(name = "numero_documento_proveedor", length = 80)
    private String numeroDocumentoProveedor;

    @Column(name = "estado_recepcion", nullable = false, length = 20)
    private String estadoRecepcion; // 'registrada','cerrada','anulada'

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
