package com.soyanga.soyangabackend.servicio.inventario.impl;

import com.soyanga.soyangabackend.dto.inventario.InventarioPorLoteResponse;
import com.soyanga.soyangabackend.repositorio.inventario.InventarioPorLoteRepositorio;
import com.soyanga.soyangabackend.servicio.inventario.InventarioPorLoteServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class InventarioPorLoteServicioImpl implements InventarioPorLoteServicio {

    private final InventarioPorLoteRepositorio repositorio;

    @Override
    public Page<InventarioPorLoteResponse> listar(Long almacenId,
                                                  String textoProductoOSku,
                                                  LocalDate venceAntes,
                                                  Pageable pageable) {

        final java.sql.Date venceAntesSql =
                (venceAntes == null) ? null : java.sql.Date.valueOf(venceAntes);

        return repositorio.buscar(almacenId, textoProductoOSku, venceAntesSql, pageable)
                .map(v -> InventarioPorLoteResponse.builder()
                        .almacenId(v.getIdAlmacen())
                        .almacen(v.getAlmacen())
                        .loteId(v.getIdLote())
                        .numeroLote(v.getNumeroLote())
                        .presentacionId(v.getIdPresentacion())
                        .sku(v.getSku())
                        .producto(v.getProducto())
                        .disponible(v.getDisponible())
                        .reservado(v.getReservado())
                        .vencimiento(v.getVencimiento())
                        .stockMinimo(v.getStockMinimo())
                        .build()
                );
    }
}
