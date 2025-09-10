package com.soyanga.soyangabackend.dto.catalogo;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class MonedaDTO {
    Long id;
    String codigo;
    String nombre;
    boolean esLocal;
    boolean estadoActivo;
    BigDecimal tasaCambioRespectoLocal;
}
