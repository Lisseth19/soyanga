package com.soyanga.soyangabackend.dto.inventario;

import java.time.LocalDateTime;

public interface TransferenciaCabeceraProjection {
    Long getIdTransferencia();
    LocalDateTime getFecha();
    String getEstado();
    Long getIdAlmacenOrigen();
    Long getIdAlmacenDestino();
    String getAlmacenOrigen();
    String getAlmacenDestino();
    String getObservaciones();
}
