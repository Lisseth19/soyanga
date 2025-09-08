package com.soyanga.soyangabackend.dto.inventario;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferenciaRespuestaDTO {
        private Long idTransferencia;
        private String estado;  // pendiente | en_transito | completada | anulada
        private int itemsProcesados;  // cuántos renglones movimos
        private LocalDateTime fecha;
        private Long idAlmacenOrigen;
        private Long idAlmacenDestino;
        private String observaciones;
}
