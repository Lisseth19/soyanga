package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductoActualizarDTO {
    private String nombreProducto;    // opcional
    private String descripcion;       // opcional
    private Long idCategoria;         // opcional
    private String principioActivo;   // opcional
    private String registroSanitario; // opcional
    private Boolean estadoActivo;     // opcional
}
