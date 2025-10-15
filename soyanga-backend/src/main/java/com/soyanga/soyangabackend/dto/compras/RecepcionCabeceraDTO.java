package com.soyanga.soyangabackend.dto.compras;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class RecepcionCabeceraDTO {
    private Long idRecepcion;
    private Long idCompra;
    private LocalDateTime fechaRecepcion;
    private Long idAlmacen;
    private String numeroDocumentoProveedor;
    private String estadoRecepcion;
    private String observaciones;
}
