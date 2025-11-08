package com.soyanga.soyangabackend.dto.catalogo;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

/** DTO que se expone al frontend */
@Value
@Builder
public class PresentacionEnAlmacenDTO {
    Long idPresentacion;
    String sku;
    String producto;
    String presentacion;   // p.ej. "1 L", si decides armarlo así en SQL
    String unidad;         // nombre/símbolo de la unidad
    BigDecimal stockDisponible;
    BigDecimal reservado;
    BigDecimal precioBob;
    String loteNumero;
    String loteVencimiento; // YYYY-MM-DD
    BigDecimal loteDisponible;
    String imagenUrl;
}
