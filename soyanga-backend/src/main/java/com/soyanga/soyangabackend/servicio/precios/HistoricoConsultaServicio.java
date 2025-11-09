// com.soyanga.soyangabackend.servicio.precios.HistoricoConsultaServicio.java
package com.soyanga.soyangabackend.servicio.precios;

import com.soyanga.soyangabackend.dto.precios.FiltroHistoricoDTO;
import com.soyanga.soyangabackend.dto.precios.PrecioHistoricoDTO;
import com.soyanga.soyangabackend.dominio.PrecioVentaHistorico;
import com.soyanga.soyangabackend.repositorio.catalogo.PresentacionProductoRepositorio;
import com.soyanga.soyangabackend.repositorio.precios.PrecioVentaHistoricoRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HistoricoConsultaServicio {

    private final PrecioVentaHistoricoRepositorio repo;
    private final PresentacionProductoRepositorio presentacionRepo;

    public Page<PrecioHistoricoDTO> buscar(FiltroHistoricoDTO filtro, Pageable pageable) {
        Long idPresentacion = null;

        if (filtro.getSku() != null && !filtro.getSku().isBlank()) {
            var p = presentacionRepo.findByCodigoSku(filtro.getSku())
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.NOT_FOUND, "SKU no encontrado"));
            idPresentacion = p.getIdPresentacion();
        }

        if (idPresentacion == null) {
            // si no pasas sku, puedes requerir id por query aparte,
            // o devolver página vacía (decisión de UX)
            return Page.empty(pageable);
        }

        var page = repo.buscarFiltrado(
                idPresentacion,
                filtro.getDesde(), filtro.getHasta(),
                filtro.getMotivo(), filtro.getUsuario(),
                pageable);

        return page.map(this::toDTO);
    }

    private PrecioHistoricoDTO toDTO(PrecioVentaHistorico h) {

        var ahora = java.time.LocalDateTime.now();
        boolean vigenteHoy = h.getFechaFinVigencia() == null
                && !h.getFechaInicioVigencia().isAfter(ahora); // inicio <= ahora


        return PrecioHistoricoDTO.builder()
                .idPrecioHistorico(h.getIdPrecioHistorico())
                .idPresentacion(h.getIdPresentacion())
                .precioVentaBob(h.getPrecioVentaBob())
                .fechaInicioVigencia(h.getFechaInicioVigencia())
                .fechaFinVigencia(h.getFechaFinVigencia())
                .motivoCambio(h.getMotivoCambio())
                .vigente(vigenteHoy)

                .build();
    }
}
