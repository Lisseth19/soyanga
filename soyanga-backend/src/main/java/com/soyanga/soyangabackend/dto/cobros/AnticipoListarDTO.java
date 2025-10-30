// src/main/java/com/soyanga/soyangabackend/dto/cobros/AnticipoListarDTO.java
package com.soyanga.soyangabackend.dto.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AnticipoListarDTO {
    public final Long idAnticipo;
    public final LocalDateTime fechaAnticipo;
    public final Long idCliente;
    public final BigDecimal montoBob;
    public final Anticipo.EstadoAnticipo estadoAnticipo;
    public final String observaciones;

    // NUEVOS (opcional si mapeas a DTO)
    public final BigDecimal aplicadoAcumuladoBob;
    public final BigDecimal saldoDisponibleBob;

    public AnticipoListarDTO(Long idAnticipo, LocalDateTime fechaAnticipo, Long idCliente,
                             BigDecimal montoBob, Anticipo.EstadoAnticipo estadoAnticipo,
                             String observaciones,
                             BigDecimal aplicadoAcumuladoBob, BigDecimal saldoDisponibleBob) {
        this.idAnticipo = idAnticipo;
        this.fechaAnticipo = fechaAnticipo;
        this.idCliente = idCliente;
        this.montoBob = montoBob;
        this.estadoAnticipo = estadoAnticipo;
        this.observaciones = observaciones;
        this.aplicadoAcumuladoBob = aplicadoAcumuladoBob;
        this.saldoDisponibleBob = saldoDisponibleBob;
    }
}
