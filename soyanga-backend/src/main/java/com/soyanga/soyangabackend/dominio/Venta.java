package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "ventas",
        indexes = {
                @Index(name = "idx_ventas_fecha", columnList = "fecha_venta"),
                @Index(name = "idx_ventas_cliente", columnList = "id_cliente")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Venta {

    public enum TipoDocumentoTributario { boleta, factura }
    public enum MetodoDePago { efectivo, transferencia, mixto }
    public enum CondicionPago { contado, credito }
    public enum EstadoVenta { borrador, confirmada, despachada, anulada }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta")
    @EqualsAndHashCode.Include
    private Long idVenta;

    @Column(name = "fecha_venta", nullable = false)
    private LocalDateTime fechaVenta;

    @Column(name = "id_cliente")
    private Long idCliente; // ON DELETE SET NULL

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento_tributario", nullable = false, length = 20)
    private TipoDocumentoTributario tipoDocumentoTributario;

    @Column(name = "numero_documento")
    private String numeroDocumento;

    @Column(name = "id_moneda", nullable = false)
    private Long idMoneda;

    @Column(name = "total_bruto_bob", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalBrutoBob = BigDecimal.ZERO;

    @Column(name = "descuento_total_bob", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal descuentoTotalBob = BigDecimal.ZERO;

    @Column(name = "total_neto_bob", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalNetoBob = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_de_pago", nullable = false, length = 20)
    private MetodoDePago metodoDePago;

    @Enumerated(EnumType.STRING)
    @Column(name = "condicion_de_pago", nullable = false, length = 20)
    private CondicionPago condicionDePago;

    @Column(name = "interes_credito", precision = 5, scale = 2)
    private BigDecimal interesCredito;


    @Column(name = "fecha_vencimiento_credito")
    private LocalDate fechaVencimientoCredito;

    @Column(name = "id_almacen_despacho", nullable = false)
    private Long idAlmacenDespacho;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_venta", nullable = false, length = 20)
    private EstadoVenta estadoVenta;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;
}
