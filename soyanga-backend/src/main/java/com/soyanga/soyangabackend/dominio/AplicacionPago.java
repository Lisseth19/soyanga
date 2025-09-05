package com.soyanga.soyangabackend.dominio;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "aplicaciones_de_pago",
        indexes = {
                @Index(name = "idx_apl_pago_pago", columnList = "id_pago_recibido"),
                @Index(name = "idx_apl_pago_cxc", columnList = "id_cuenta_cobrar")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AplicacionPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_aplicacion_pago")
    @EqualsAndHashCode.Include
    private Long idAplicacionPago;

    @Column(name = "id_pago_recibido", nullable = false)
    private Long idPagoRecibido;

    @Column(name = "id_cuenta_cobrar", nullable = false)
    private Long idCuentaCobrar;

    @Column(name = "monto_aplicado_bob", nullable = false, precision = 18, scale = 2)
    private BigDecimal montoAplicadoBob;
}
