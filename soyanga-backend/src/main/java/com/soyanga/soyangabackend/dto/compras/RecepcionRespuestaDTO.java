package com.soyanga.soyangabackend.dto.compras;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecepcionRespuestaDTO {
    private Long idRecepcion;
    private String estado;
    private int itemsCreados;
}
