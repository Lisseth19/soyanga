package com.soyanga.soyangabackend.dto.clientes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClienteEditarDTO {

    @NotBlank(message = "razonSocialONombre es requerido")
    private String razonSocialONombre;

    private String nit;
    private String telefono;
    private String correoElectronico;
    private String direccion;
    private String ciudad;

    @Pattern(regexp = "contado|credito", flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "condicionDePago debe ser contado|credito")
    private String condicionDePago;

    private BigDecimal limiteCreditoBob;

    // permitir activar/desactivar
    private Boolean estadoActivo;
}
