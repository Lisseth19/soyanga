// src/main/java/com/soyanga/soyangabackend/dto/cobros/ReservaAnticipoDTO.java
package com.soyanga.soyangabackend.dto.cobros;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public class ReservaAnticipoDTO {

    @NotEmpty
    private List<Item> items;

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }

    public static class Item {
        @NotNull private Long idPresentacion;
        @NotNull private Long idAlmacen;
        @NotNull @Positive private BigDecimal cantidad;

        public Long getIdPresentacion() { return idPresentacion; }
        public void setIdPresentacion(Long idPresentacion) { this.idPresentacion = idPresentacion; }
        public Long getIdAlmacen() { return idAlmacen; }
        public void setIdAlmacen(Long idAlmacen) { this.idAlmacen = idAlmacen; }
        public BigDecimal getCantidad() { return cantidad; }
        public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    }
}
