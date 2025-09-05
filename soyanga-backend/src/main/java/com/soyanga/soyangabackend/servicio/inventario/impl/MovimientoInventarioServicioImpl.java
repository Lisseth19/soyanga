package com.soyanga.soyangabackend.servicio.inventario.impl;

import com.soyanga.soyangabackend.dto.inventario.MovimientoInventarioResponse;
import com.soyanga.soyangabackend.repositorio.inventario.MovimientoInventarioDao;
import com.soyanga.soyangabackend.servicio.inventario.MovimientoInventarioServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MovimientoInventarioServicioImpl implements MovimientoInventarioServicio {

    private final MovimientoInventarioDao dao; // 👈 antes era el repositorio

    @Override
    public List<MovimientoInventarioResponse> ultimos(Long loteId, Long almacenId, int limite) {
        return dao.ultimos(loteId, almacenId, limite);
    }
}
