package com.soyanga.soyangabackend.dto.inventario;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferenciaRespuestaDTO {
        private Long idTransferencia;
        private String estado;        // p.e. "completada"
        private int itemsProcesados;  // cuántos renglones movimos
}
