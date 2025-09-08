package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.CodigoBarras;
import com.soyanga.soyangabackend.dominio.PresentacionProducto;
import com.soyanga.soyangabackend.dto.catalogo.PresentacionLookupDTO;
import com.soyanga.soyangabackend.repositorio.catalogo.CodigoBarrasRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.ProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.UnidadMedidaRepositorio;
import com.soyanga.soyangabackend.servicio.precios.PrecioHistoricoServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PresentacionLookupServicio {

    private final PresentacionProductoRepositorio presentacionRepo;
    private final CodigoBarrasRepositorio codigoRepo;
    private final ProductoRepositorio productoRepo;
    private final UnidadMedidaRepositorio unidadRepo;
    private final PrecioHistoricoServicio precioSrv;

    public PresentacionLookupDTO porSku(String sku) {
        var p = presentacionRepo.findByCodigoSku(sku.trim())
                .orElseThrow(() -> new IllegalArgumentException("SKU no encontrado"));
        return buildDTO(p);
    }

    public PresentacionLookupDTO porCodigoBarras(String barcode) {
        CodigoBarras cb = codigoRepo.findFirstByCodigoBarras(barcode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Código de barras no encontrado"));
        var p = presentacionRepo.findById(cb.getIdPresentacion())
                .orElseThrow(() -> new IllegalArgumentException("Presentación no encontrada"));
        return buildDTO(p);
    }

    private PresentacionLookupDTO buildDTO(PresentacionProducto p) {
        var prod = productoRepo.findById(p.getIdProducto()).orElse(null);
        var uni = unidadRepo.findById(p.getIdUnidad()).orElse(null);
        var vigente = precioSrv.vigente(p.getIdPresentacion());

        return PresentacionLookupDTO.builder()
                .idPresentacion(p.getIdPresentacion())
                .codigoSku(p.getCodigoSku())
                .idProducto(p.getIdProducto())
                .nombreProducto(prod != null ? prod.getNombreProducto() : null)
                .idUnidad(p.getIdUnidad())
                .simboloUnidad(uni != null ? uni.getSimboloUnidad() : null)
                .contenidoPorUnidad(p.getContenidoPorUnidad())
                .precioVigenteBob(vigente != null ? vigente.getPrecioVentaBob() : null)
                .precioVigenteInicio(vigente != null ? vigente.getFechaInicioVigencia() : null)
                .build();
    }
}
