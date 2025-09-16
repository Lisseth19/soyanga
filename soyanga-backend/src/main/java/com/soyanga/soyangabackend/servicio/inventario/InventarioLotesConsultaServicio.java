package com.soyanga.soyangabackend.servicio.inventario;

import com.soyanga.soyangabackend.dto.inventario.InventarioPorLoteResponse;
import com.soyanga.soyangabackend.repositorio.inventario.InventarioPorLoteRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class InventarioLotesConsultaServicio {

    private final InventarioPorLoteRepositorio repo;

    @Transactional(readOnly = true)
    public Page<InventarioPorLoteResponse> listar(Long almacenId,
                                                  String textoProductoOSku,
                                                  LocalDate venceAntes,
                                                  Pageable pageable) {

        final String q = (textoProductoOSku == null || textoProductoOSku.isBlank())
                ? null
                : textoProductoOSku.trim();

        // 👇 convertimos LocalDate a String ISO (YYYY-MM-DD) o null
        final String venceStr = (venceAntes != null) ? venceAntes.toString() : null;

        return repo.buscar(almacenId, q, venceStr, pageable)
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
