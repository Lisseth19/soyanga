package com.soyanga.soyangabackend.dto.inventario;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferenciaDetalleDTO {
    private Long idTransferencia;
    private LocalDateTime fecha;
    private String estado;

    private Long idAlmacenOrigen;
    private Long idAlmacenDestino;
    private String almacenOrigen;
    private String almacenDestino;

    private String observaciones;

    private List<Item> items;
    private List<Movimiento> movimientos;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        private Long idLote;
        private String numeroLote;
        private Long idPresentacion;
        private String sku;
        private String producto;
        private BigDecimal cantidad;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Movimiento {
        private Long idMovimiento;
        private LocalDateTime fechaMovimiento;
        private String tipoMovimiento; // transferencia_salida / transferencia_ingreso
        private Long idLote;
        private BigDecimal cantidad;
        private Long idAlmacenOrigen;
        private Long idAlmacenDestino;
    }
}
