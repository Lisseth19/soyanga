// com.soyanga.soyangabackend.dto.precios.ResumenRecalculoDTO.java
package com.soyanga.soyangabackend.dto.precios;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenRecalculoDTO {
    private int cambiados;
    private int iguales;
    private int omitidos;
    private List<ItemCambioDTO> items;
}
