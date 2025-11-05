package com.soyanga.soyangabackend.web.inventario;

import com.soyanga.soyangabackend.dto.inventario.AlertaListadoProjection;
import com.soyanga.soyangabackend.dto.inventario.AlertasResumenDTO;
import com.soyanga.soyangabackend.repositorio.inventario.AlertasRepositorio;
import lombok.RequiredArgsConstructor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/inventario/alertas")
@RequiredArgsConstructor
public class AlertasControlador {

  private final AlertasRepositorio alertasRepo;

  /**
   * Lista paginada de alertas desde la vista vw_alertas_inventario.
   *
   * @param tipo      (opcional) filtra por tipo_alerta
   * @param severidad (opcional) 'urgente' | 'advertencia' | 'proximo'
   * @param almacenId (opcional) id_almacen
   * @param q         (opcional) busca por sku, producto o numero_lote
   * @param pageable  paginación Spring (page, size, sort ignorado por el ORDER BY
   *                  de la query)
   */
  @GetMapping
  public Page<AlertaListadoProjection> listar(
      @RequestParam(required = false) String tipo,
      @RequestParam(required = false) String severidad,
      @RequestParam(required = false) Long almacenId,
      @RequestParam(required = false) String q,
      Pageable pageable) {
    return alertasRepo.listar(tipo, severidad, almacenId, q, pageable);
  }

  // ======= NUEVO: resumen (conteos + top N) =======
  @GetMapping("/resumen")
  public AlertasResumenDTO resumen(
      @RequestParam(required = false) String tipo,
      @RequestParam(required = false) String severidad,
      @RequestParam(required = false) Long almacenId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "5") int top) {
    // Conteos
    List<AlertasRepositorio.ConteoKV> s = alertasRepo.conteoPorSeveridad(tipo, severidad, almacenId, q);
    List<AlertasRepositorio.ConteoKV> t = alertasRepo.conteoPorTipo(tipo, severidad, almacenId, q);

    Map<String, Long> porSeveridad = new LinkedHashMap<>();
    Map<String, Long> porTipo = new LinkedHashMap<>();
    long total = 0L;

    for (AlertasRepositorio.ConteoKV kv : s) {
      String clave = kv.getClave() == null ? "" : kv.getClave();
      porSeveridad.put(clave, kv.getCantidad());
      total += kv.getCantidad();
    }
    for (AlertasRepositorio.ConteoKV kv : t) {
      String clave = kv.getClave() == null ? "" : kv.getClave();
      porTipo.put(clave, kv.getCantidad());
    }

    // Top N usando la misma query de listar (orden por prioridad)
    Pageable pg = PageRequest.of(0, Math.max(1, Math.min(top, 20)));
    List<AlertaListadoProjection> topItems = alertasRepo.listar(tipo, severidad, almacenId, q, pg).getContent();

    return new AlertasResumenDTO(total, porSeveridad, porTipo, topItems);
  }
}
