package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "clientes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Cliente {

    public enum CondicionPago { contado, credito }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cliente")
    @EqualsAndHashCode.Include
    private Long idCliente;

    @Column(name = "razon_social_o_nombre", nullable = false)
    private String razonSocialONombre;

    @Column(name = "nit")
    private String nit;

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "correo_electronico")
    private String correoElectronico;

    @Column(name = "direccion")
    private String direccion;

    @Column(name = "ciudad")
    private String ciudad;

    @Enumerated(EnumType.STRING)
    @Column(name = "condicion_de_pago", nullable = false, length = 20)
    private CondicionPago condicionDePago;

    @Column(name = "limite_credito_bob", precision = 18, scale = 2)
    private BigDecimal limiteCreditoBob;

    @Column(name = "estado_activo", nullable = false)
    @Builder.Default
    private Boolean estadoActivo = true;
}
