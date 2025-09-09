package com.soyanga.soyangabackend.dto.sucursales;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SucursalRespuestaDTO {
    private Long idSucursal;
    private String nombreSucursal;
    private String direccion;
    private String ciudad;
    private Boolean estadoActivo;
}
