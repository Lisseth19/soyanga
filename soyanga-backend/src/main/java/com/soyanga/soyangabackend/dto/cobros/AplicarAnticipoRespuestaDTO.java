package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AplicarAnticipoRespuestaDTO {
    private Long idAplicacionAnticipo;
    private Long idAnticipo;
    private Long idVenta;
    private BigDecimal montoAplicadoBob;
    private LocalDateTime fechaAplicacion;

    private BigDecimal saldoAnticipoAntes;
    private BigDecimal saldoAnticipoDespues;

    private BigDecimal cxcPendienteAntes;
    private BigDecimal cxcPendienteDespues;

    private String estadoAnticipo; // registrado | parcialmente_aplicado | aplicado_total | anulado
    private String estadoCxc;      // pendiente | parcial | pagado | vencido
}
