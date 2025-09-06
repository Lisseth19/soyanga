package com.soyanga.soyangabackend.dto.compras;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecepcionCrearDTO {

    @NotNull(message = "idCompra es requerido")
    private Long idCompra;

    @NotNull(message = "idAlmacen es requerido")
    private Long idAlmacen;

    private LocalDateTime fechaRecepcion; // si viene null, usamos now()
    private String numeroDocumentoProveedor;
    private String observaciones;

    @Valid
    @NotNull(message = "items es requerido")
    private List<RecepcionItemDTO> items;
}
