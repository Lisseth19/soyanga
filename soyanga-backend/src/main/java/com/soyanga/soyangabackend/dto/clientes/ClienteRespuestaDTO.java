package com.soyanga.soyangabackend.dto.clientes;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClienteRespuestaDTO {
    private Long idCliente;
    private String razonSocialONombre;
    private String nit;
    private String telefono;
    private String correoElectronico;
    private String direccion;
    private String ciudad;
    private String condicionDePago; // contado|credito
    private BigDecimal limiteCreditoBob;
    private Boolean estadoActivo;
}
