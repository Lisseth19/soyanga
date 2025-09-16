package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "productos", indexes = {
                @Index(name = "idx_productos_categoria", columnList = "id_categoria")
// Nota: el índice GIN por to_tsvector no se mapea desde JPA (es de DB).
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Producto {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name = "id_producto")
        @EqualsAndHashCode.Include
        private Long idProducto;

        @Column(name = "nombre_producto", nullable = false)
        private String nombreProducto;

        @Column(name = "descripcion")
        private String descripcion;

        @Column(name = "id_categoria", nullable = false)
        private Long idCategoria;

        @Column(name = "principio_activo")
        private String principioActivo;

        @Column(name = "registro_sanitario")
        private String registroSanitario;

        @Column(name = "estado_activo", nullable = false)
        @Builder.Default
        private Boolean estadoActivo = true;
}
