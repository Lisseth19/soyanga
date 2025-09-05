package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dto.inventario.MovimientoInventarioResponse;
import java.util.List;

public interface MovimientoInventarioServicio {
    List<MovimientoInventarioResponse> ultimos(Long loteId, Long almacenId, int limite);
}
