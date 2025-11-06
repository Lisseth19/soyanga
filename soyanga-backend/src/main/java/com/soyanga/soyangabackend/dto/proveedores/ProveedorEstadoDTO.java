package com.soyanga.soyangabackend.dto.proveedores;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProveedorEstadoDTO {
    @NotNull
    private Boolean activo;
}
