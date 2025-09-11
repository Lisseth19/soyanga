package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmacenCrearDTO {
    @NotNull(message = "La sucursal es requerida")
    private Long idSucursal;

    @NotBlank(message = "El nombre del almacén es requerido")
    private String nombreAlmacen;

    private String descripcion;
    private Boolean estadoActivo; // opcional (default TRUE en DB)
}
