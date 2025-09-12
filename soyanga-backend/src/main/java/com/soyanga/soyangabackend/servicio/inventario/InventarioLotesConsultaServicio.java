package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dto.inventario.InventarioPorLoteResponse;
import com.soyanga.soyangabackend.repositorio.inventario.InventarioPorLoteRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class InventarioLotesConsultaServicio {

    private final InventarioPorLoteRepositorio repo;

    public Page<InventarioPorLoteResponse> listar(Long almacenId,
                                                  String textoProductoOSku,
                                                  LocalDate venceAntes,
                                                  Pageable pageable) {

        String q = (textoProductoOSku == null || textoProductoOSku.isBlank()) ? null : textoProductoOSku.trim();

        return repo.buscar(almacenId, q, venceAntes, pageable)
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
                        .build());
    }
}
