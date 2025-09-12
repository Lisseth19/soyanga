package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmacenRespuestaDTO {
    private Long idAlmacen;
    private Long idSucursal;
    private String sucursal;
    private String nombreAlmacen;
    private String descripcion;
    private Boolean estadoActivo;
}
