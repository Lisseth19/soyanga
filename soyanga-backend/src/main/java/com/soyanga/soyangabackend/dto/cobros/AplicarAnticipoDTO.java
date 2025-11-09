// src/main/java/com/soyanga/soyangabackend/dto/cobros/AplicarAnticipoDTO.java
package com.soyanga.soyangabackend.dto.cobros;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

// ESTE ES EL QUE SIRVE
public class AplicarAnticipoDTO {
    @NotNull private Long idVenta;
    @NotNull @Positive private BigDecimal montoAplicadoBob;

    public AplicarAnticipoDTO() {}
    public AplicarAnticipoDTO(Long idVenta, BigDecimal montoAplicadoBob) {
        this.idVenta = idVenta; this.montoAplicadoBob = montoAplicadoBob;
    }

    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long idVenta) { this.idVenta = idVenta; }
    public BigDecimal getMontoAplicadoBob() { return montoAplicadoBob; }
    public void setMontoAplicadoBob(BigDecimal montoAplicadoBob) { this.montoAplicadoBob = montoAplicadoBob; }

    public static AplicarAnticipoDTO of(Long idVenta, BigDecimal monto) {
        return new AplicarAnticipoDTO(idVenta, monto);
    }
}
