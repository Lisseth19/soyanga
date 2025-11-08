// src/main/java/com/soyanga/soyangabackend/dto/cobros/ReservaAnticipoRespuestaDTO.java
package com.soyanga.soyangabackend.dto.cobros;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;


public class ReservaAnticipoRespuestaDTO {

    private Long idAnticipo;
    /** "reservar" | "liberar" | "consulta" */
    private String operacion;
    private Integer itemsProcesados;

    private List<ResultadoItem> resultados;

    public Long getIdAnticipo() { return idAnticipo; }
    public void setIdAnticipo(Long idAnticipo) { this.idAnticipo = idAnticipo; }
    public String getOperacion() { return operacion; }
    public void setOperacion(String operacion) { this.operacion = operacion; }
    public Integer getItemsProcesados() { return itemsProcesados; }
    public void setItemsProcesados(Integer itemsProcesados) { this.itemsProcesados = itemsProcesados; }
    public List<ResultadoItem> getResultados() { return resultados; }
    public void setResultados(List<ResultadoItem> resultados) { this.resultados = resultados; }

    public static class ResultadoItem {
        private Long idPresentacion;
        private Long idAlmacen;
        private BigDecimal cantidadProcesada; // reservada (+) o liberada (+); la semántica la define "operacion"
        private List<LotePick> lotes;

        public Long getIdPresentacion() { return idPresentacion; }
        public void setIdPresentacion(Long idPresentacion) { this.idPresentacion = idPresentacion; }
        public Long getIdAlmacen() { return idAlmacen; }
        public void setIdAlmacen(Long idAlmacen) { this.idAlmacen = idAlmacen; }
        public BigDecimal getCantidadProcesada() { return cantidadProcesada; }
        public void setCantidadProcesada(BigDecimal cantidadProcesada) { this.cantidadProcesada = cantidadProcesada; }
        public List<LotePick> getLotes() { return lotes; }
        public void setLotes(List<LotePick> lotes) { this.lotes = lotes; }
    }

    public static class LotePick {
        private Long idLote;
        private String numeroLote;
        private LocalDate fechaVencimiento;
        private BigDecimal cantidad;

        public Long getIdLote() { return idLote; }
        public void setIdLote(Long idLote) { this.idLote = idLote; }
        public String getNumeroLote() { return numeroLote; }
        public void setNumeroLote(String numeroLote) { this.numeroLote = numeroLote; }
        public LocalDate getFechaVencimiento() { return fechaVencimiento; }
        public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }
        public BigDecimal getCantidad() { return cantidad; }
        public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
    }
}
