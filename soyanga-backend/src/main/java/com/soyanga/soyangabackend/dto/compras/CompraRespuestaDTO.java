package com.soyanga.soyangabackend.dto.compras;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompraRespuestaDTO {
    private Long idCompra;
    private Long idProveedor;
    private String proveedor; // opcional si quieres mostrarlo
    private LocalDateTime fechaCompra;
    private Long idMoneda;
    private BigDecimal tipoCambioUsado;
    private String estado; // enum name
    private String observaciones;

    private Integer totalItems;
    private BigDecimal totalMoneda;

    private List<CompraDetalleRespuestaDTO> items;
}
