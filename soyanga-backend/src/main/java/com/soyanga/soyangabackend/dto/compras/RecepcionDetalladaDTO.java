package com.soyanga.soyangabackend.dto.compras;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class RecepcionDetalladaDTO {
    private Long idRecepcion;
    private Long idCompra;
    private LocalDateTime fechaRecepcion;
    private Long idAlmacen;
    private String numeroDocumentoProveedor;
    private String estadoRecepcion;
    private String observaciones;
    private List<RecepcionItemDTO> items;
}
