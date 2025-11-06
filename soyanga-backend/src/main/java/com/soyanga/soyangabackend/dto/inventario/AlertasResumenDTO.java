package com.soyanga.soyangabackend.dto.inventario;

import java.util.List;
import java.util.Map;

public record AlertasResumenDTO(
        long total,
        Map<String, Long> porSeveridad,
        Map<String, Long> porTipo,
        List<AlertaListadoProjection> top) {
}
