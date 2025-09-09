package com.soyanga.soyangabackend.dto.proveedores;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProveedorRespuestaDTO {
    private Long idProveedor;
    private String razonSocial;
    private String nit;
    private String contacto;
    private String telefono;
    private String correoElectronico;
    private String direccion;
    private Boolean estadoActivo;
}
