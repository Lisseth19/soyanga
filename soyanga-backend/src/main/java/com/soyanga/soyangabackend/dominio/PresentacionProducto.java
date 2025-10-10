package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "presentaciones_de_productos", indexes = {
                @Index(name = "idx_presentaciones_producto", columnList = "id_producto")
}, uniqueConstraints = {
                @UniqueConstraint(name = "uk_presentaciones_codigo_sku", columnNames = { "codigo_sku" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PresentacionProducto {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name = "id_presentacion")
        @EqualsAndHashCode.Include
        private Long idPresentacion;

        @Column(name = "id_producto", nullable = false)
        private Long idProducto;

        @Column(name = "id_unidad", nullable = false)
        private Long idUnidad;

        @Column(name = "contenido_por_unidad", nullable = false, precision = 18, scale = 6)
        private BigDecimal contenidoPorUnidad;

        @Column(name = "codigo_sku", nullable = false)
        private String codigoSku;

        @Column(name = "imagen_url")
        private String imagenUrl; // NUEVO

        @Column(name = "costo_base_usd", nullable = false, precision = 18, scale = 6)
        @Builder.Default
        private BigDecimal costoBaseUsd = BigDecimal.ZERO;

        @Column(name = "margen_venta_porcentaje", nullable = false, precision = 9, scale = 4)
        @Builder.Default
        private BigDecimal margenVentaPorcentaje = BigDecimal.ZERO;

        @Column(name = "precio_venta_bob", nullable = false, precision = 18, scale = 6)
        @Builder.Default
        private BigDecimal precioVentaBob = BigDecimal.ZERO;

        @Column(name = "estado_activo", nullable = false)
        @Builder.Default
        private Boolean estadoActivo = true;
}
