// com.soyanga.soyangabackend.dto.precios.FiltroHistoricoDTO.java
package com.soyanga.soyangabackend.dto.precios;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FiltroHistoricoDTO {
    private String sku; // opcional
    private LocalDateTime desde; // opcional
    private LocalDateTime hasta; // opcional
    private String motivo; // opcional (contains, case-insensitive)
    private String usuario; // opcional (contains)
}
