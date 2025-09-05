package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductoCrearDTO {
    private String nombreProducto;    // requerido
    private String descripcion;
    private Long idCategoria;         // requerido
    private String principioActivo;
    private String registroSanitario;
}
