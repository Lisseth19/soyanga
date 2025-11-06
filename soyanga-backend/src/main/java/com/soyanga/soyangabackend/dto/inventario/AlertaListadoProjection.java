package com.soyanga.soyangabackend.dto.inventario;

public interface AlertaListadoProjection {
    Long getIdAlerta();

    Long getIdAlmacen();

    Long getIdLote();

    Long getIdPresentacion();

    String getAlmacen();

    String getNumeroLote();

    String getSku();

    String getProducto();

    java.math.BigDecimal getStockDisponible();

    java.math.BigDecimal getStockReservado();

    java.math.BigDecimal getStockMinimo();

    java.time.LocalDate getVenceEl();

    Integer getDiasRestantes();

    String getTipo();

    String getSeveridad();

    String getMotivo();

    Integer getPrioridad();

    String getEstadoHash();
}
