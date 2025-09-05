package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;

import java.util.List;

public interface AlmacenServicio {
    List<OpcionIdNombre> listarOpciones(boolean soloActivos);
}
