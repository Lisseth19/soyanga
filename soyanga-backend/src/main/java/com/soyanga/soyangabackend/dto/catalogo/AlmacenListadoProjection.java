package com.soyanga.soyangabackend.dto.catalogo;

public interface AlmacenListadoProjection {
    Long getIdAlmacen();
    String getNombreAlmacen();
    String getDescripcion();
    Boolean getEstadoActivo();
    Long getIdSucursal();
    String getSucursal();
}
