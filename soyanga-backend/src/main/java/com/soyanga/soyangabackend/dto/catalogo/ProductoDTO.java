package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductoDTO {
    private Long idProducto;
    private String nombreProducto;
    private String descripcion;
    private Long idCategoria;
    private String principioActivo;
    private String registroSanitario;
    private Boolean estadoActivo;
}
