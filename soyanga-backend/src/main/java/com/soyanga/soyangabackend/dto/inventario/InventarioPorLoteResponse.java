package com.soyanga.soyangabackend.dto.inventario;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;

@Value
@Builder
public class InventarioPorLoteResponse {
    Long almacenId;
    String almacen;

    Long loteId;
    String numeroLote;

    Long presentacionId;
    String sku;
    String producto;

    BigDecimal disponible; // stock utilizable
    BigDecimal reservado;  // stock comprometido
    LocalDate vencimiento;
    BigDecimal stockMinimo;
}
