package com.soyanga.soyangabackend.dto.sucursales;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SucursalEditarDTO {
    @NotBlank(message = "El nombre de la sucursal es requerido")
    private String nombreSucursal;

    @NotBlank(message = "La dirección es requerida")
    private String direccion;

    @NotBlank(message = "La ciudad es requerida")
    private String ciudad;

    private Boolean estadoActivo;
}
