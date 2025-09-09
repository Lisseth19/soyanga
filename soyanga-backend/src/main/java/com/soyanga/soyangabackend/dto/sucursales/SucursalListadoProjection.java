package com.soyanga.soyangabackend.dto.sucursales;

public interface SucursalListadoProjection {
    Long getIdSucursal();
    String getNombreSucursal();
    String getDireccion();
    String getCiudad();
    Boolean getEstadoActivo();
}
