// com.soyanga.soyangabackend.servicio.precios.PoliticaRedondeo.java
package com.soyanga.soyangabackend.servicio.precios;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.*;

@Component
@RequiredArgsConstructor
public class PoliticaRedondeo {

    private final ConfigRedondeoServicio cfgSrv;

    public BigDecimal aplicar(BigDecimal valor) {
        if (valor == null)
            return null;
        var cfg = cfgSrv.get();
        String modo = cfg.getModo() == null ? "ENTERO" : cfg.getModo();

        return switch (modo) {
            case "MULTIPLO" -> multiplo(valor, cfg.getMultiplo() != null ? cfg.getMultiplo() : BigDecimal.ONE);
            case "DECIMALES" -> valor.setScale(
                    cfg.getDecimales() != null ? cfg.getDecimales() : 0, RoundingMode.HALF_UP);
            case "NINGUNO" -> valor;
            default -> valor.setScale(0, RoundingMode.HALF_UP); // ENTERO
        };
    }

    private BigDecimal multiplo(BigDecimal v, BigDecimal m) {
        BigDecimal k = v.divide(m, 0, RoundingMode.HALF_UP);
        return k.multiply(m);
    }
}
