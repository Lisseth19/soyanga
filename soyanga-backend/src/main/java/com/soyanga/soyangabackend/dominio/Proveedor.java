package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "proveedores")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proveedor")
    @EqualsAndHashCode.Include
    private Long idProveedor;

    @Column(name = "razon_social", nullable = false)
    private String razonSocial;

    @Column(name = "nit")
    private String nit;

    @Column(name = "contacto")
    private String contacto;

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "correo_electronico")
    private String correoElectronico;

    @Column(name = "direccion")
    private String direccion;

    @Column(name = "estado_activo", nullable = false)
    @Builder.Default
    private Boolean estadoActivo = true;
}
