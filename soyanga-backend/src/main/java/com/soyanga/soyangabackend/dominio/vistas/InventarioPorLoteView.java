package com.soyanga.soyangabackend.dominio.vistas;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.ToString;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "vw_inventario_por_lote")
@Immutable
@Getter
@ToString
public class InventarioPorLoteView {

    @Id
    @Column(name = "id_existencia_lote")
    private Long idExistenciaLote;

    @Column(name = "id_almacen")
    private Long idAlmacen;

    @Column(name = "almacen")
    private String almacen;

    @Column(name = "id_lote")
    private Long idLote;

    @Column(name = "numero_lote")
    private String numeroLote;

    @Column(name = "id_presentacion")
    private Long idPresentacion;

    @Column(name = "sku")
    private String sku;

    @Column(name = "producto")
    private String producto;

    @Column(name = "disponible")
    private BigDecimal disponible;

    @Column(name = "reservado")
    private BigDecimal reservado;

    @Column(name = "stock_minimo")
    private java.math.BigDecimal stockMinimo;

    @Column(name = "vencimiento")
    private LocalDate vencimiento;
}
