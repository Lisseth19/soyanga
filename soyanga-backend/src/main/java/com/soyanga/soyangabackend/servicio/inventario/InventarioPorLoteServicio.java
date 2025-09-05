package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dto.inventario.InventarioPorLoteResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface InventarioPorLoteServicio {
    Page<InventarioPorLoteResponse> listar(Long almacenId,
                                           String textoProductoOSku,
                                           LocalDate venceAntes,
                                           Pageable pageable);
}
