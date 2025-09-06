package com.soyanga.soyangabackend.web.catalogo;

import com.soyanga.soyangabackend.dto.catalogo.PresentacionLookupDTO;
import com.soyanga.soyangabackend.servicio.catalogo.PresentacionLookupServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalogo/presentaciones/lookup")
@RequiredArgsConstructor
public class PresentacionLookupControlador {

    private final PresentacionLookupServicio servicio;

    // /lookup?sku=GLI-1L   o   /lookup?barcode=789123...
    @GetMapping
    public PresentacionLookupDTO lookup(@RequestParam(required = false) String sku,
                                        @RequestParam(required = false) String barcode) {
        if (sku != null && !sku.isBlank()) return servicio.porSku(sku);
        if (barcode != null && !barcode.isBlank()) return servicio.porCodigoBarras(barcode);
        throw new IllegalArgumentException("Debe enviar 'sku' o 'barcode'");
    }
}
