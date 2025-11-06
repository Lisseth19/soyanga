// com.soyanga.soyangabackend.dto.precios.ConfigRedondeoDTO.java
package com.soyanga.soyangabackend.dto.precios;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfigRedondeoDTO {
    private String modo; // ENTERO | MULTIPLO | DECIMALES | NINGUNO
    private BigDecimal multiplo; // si modo = MULTIPLO
    private Integer decimales; // si modo = DECIMALES
}
