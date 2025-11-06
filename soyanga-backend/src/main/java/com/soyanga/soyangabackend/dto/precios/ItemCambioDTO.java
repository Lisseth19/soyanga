// com.soyanga.soyangabackend.dto.precios.ItemCambioDTO.java
package com.soyanga.soyangabackend.dto.precios;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemCambioDTO {
    private Long idPresentacion;
    private String sku;
    private BigDecimal anterior;
    private BigDecimal nuevo;

    public static ItemCambioDTO of(Long id, String sku, BigDecimal ant, BigDecimal neu) {
        return ItemCambioDTO.builder()
                .idPresentacion(id).sku(sku).anterior(ant).nuevo(neu).build();
    }
}
