package com.soyanga.soyangabackend.dto.ventas;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VentaListadoDTO(
        Long idVenta,
        String numeroDocumento,
        LocalDateTime fechaVenta,
        String tipoDocumentoTributario,  // o enum
        String condicionDePago,          // o enum
        String metodoDePago,             // o enum
        String cliente,
        BigDecimal totalNetoBob,         // neto con impuesto
        BigDecimal interesCredito,       // % (null para contado)
        BigDecimal cxcPendienteBob,      // ya lo tenían
        BigDecimal cxcTotalCobrarBob     // << NUEVO: total fijo a mostrar en la lista
) {}