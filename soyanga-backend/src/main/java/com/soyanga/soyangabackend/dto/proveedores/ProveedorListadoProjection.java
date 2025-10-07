package com.soyanga.soyangabackend.dto.proveedores;

public interface ProveedorListadoProjection {
    Long getIdProveedor();
    String getRazonSocial();
    String getNit();
    String getContacto();
    String getTelefono();
    String getDireccion();
    String getCorreoElectronico();
    Boolean getEstadoActivo();
}
