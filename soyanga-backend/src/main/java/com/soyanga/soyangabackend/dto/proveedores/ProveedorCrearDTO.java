package com.soyanga.soyangabackend.dto.proveedores;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProveedorCrearDTO {
    @NotBlank(message = "La razón social es requerida")
    private String razonSocial;

    private String nit;
    private String contacto;
    private String telefono;

    @Email(message = "Correo inválido")
    private String correoElectronico;

    private String direccion;

    // opcional: si no envías, por defecto true en la tabla
    private Boolean estadoActivo;
}
