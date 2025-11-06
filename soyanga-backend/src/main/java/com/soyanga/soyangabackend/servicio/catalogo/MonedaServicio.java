package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Moneda;
import com.soyanga.soyangabackend.dominio.TipoDeCambio;
import com.soyanga.soyangabackend.dto.catalogo.*;
import com.soyanga.soyangabackend.repositorio.catalogo.MonedaRepositorio;
import com.soyanga.soyangabackend.repositorio.catalogo.TipoDeCambioRepositorio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class MonedaServicio {

    private final MonedaRepositorio repo;
    private final TipoDeCambioRepositorio tcRepo;

    public MonedaServicio(MonedaRepositorio repo, TipoDeCambioRepositorio tcRepo) {
        this.repo = repo;
        this.tcRepo = tcRepo;
    }

    // ------------ QUERIES ------------

    @Transactional(readOnly = true)
    public Page<MonedaDTO> listar(String q, Boolean activos, Pageable pageable) {
        String pattern = (q == null || q.isBlank()) ? null : "%" + q.trim().toLowerCase() + "%";
        Long localId = repo.findLocal().map(Moneda::getIdMoneda).orElse(null);

        return repo.buscar(pattern, activos, pageable)
                .map(m -> {
                    boolean esLocal = Boolean.TRUE.equals(m.getEsMonedaLocal());
                    MonedaDTO dto = new MonedaDTO(
                            m.getIdMoneda(),
                            m.getCodigoMoneda(),
                            m.getNombreMoneda(),
                            esLocal,
                            m.isEstadoActivo(),
                            null // se calcula abajo si NO es local
                    );
                    if (!esLocal) {
                        dto.setTasaCambioRespectoLocal(tasaRespectoALocal(m.getIdMoneda(), localId, LocalDate.now()));
                    }
                    return dto;
                });
    }

    @Transactional(readOnly = true)
    public List<MonedaDTO> listarNoLocalesConTC(Boolean activos, LocalDate fecha) {
        LocalDate dia = (fecha != null) ? fecha : LocalDate.now();
        Long localId = repo.findLocal().map(Moneda::getIdMoneda).orElse(null);

        return repo.listarNoLocales(activos).stream()
                .map(m -> new MonedaDTO(
                        m.getIdMoneda(),
                        m.getCodigoMoneda(),
                        m.getNombreMoneda(),
                        false,
                        m.isEstadoActivo(),
                        tasaRespectoALocal(m.getIdMoneda(), localId, dia)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public MonedaDTO obtenerLocal() {
        Moneda m = repo.findLocal()
                .orElseThrow(() -> new IllegalStateException("No hay moneda local definida."));
        return new MonedaDTO(
                m.getIdMoneda(),
                m.getCodigoMoneda(),
                m.getNombreMoneda(),
                true,
                m.isEstadoActivo(),
                null
        );
    }

    // ------------ COMANDOS ------------

    public MonedaDTO crear(MonedaCrearDTO dto) {
        String codigo = dto.codigo().trim().toUpperCase();
        String nombre = dto.nombre().trim();

        repo.findByCodigoMonedaIgnoreCase(codigo).ifPresent(x -> {
            throw new IllegalArgumentException("Ya existe una moneda con código " + codigo);
        });

        Moneda m = new Moneda();
        m.setCodigoMoneda(codigo);
        m.setNombreMoneda(nombre);
        m.setEsMonedaLocal(dto.esLocal());
        m.setEstadoActivo(true);

        if (dto.esLocal()) {
            // asegúrate de que quede una sola local
            repo.findLocal().ifPresent(local -> {
                local.setEsMonedaLocal(false);
                repo.save(local);
            });
        }

        Moneda saved = repo.save(m);

        // Si NO es local y vino tasa => upsert TC contra la local (fecha = hoy o dto.fechaVigencia)
        if (!saved.getEsMonedaLocal() && dto.tasaCambioRespectoLocal() != null) {
            if (dto.tasaCambioRespectoLocal().compareTo(BigDecimal.ZERO) <= 0)
                throw new IllegalArgumentException("La tasa debe ser mayor a 0.");

            Moneda local = repo.findLocal()
                    .orElseThrow(() -> new IllegalStateException("No hay moneda local definida."));

            LocalDate fecha = (dto.fechaVigencia() != null) ? dto.fechaVigencia() : LocalDate.now();

            var tc = tcRepo.findByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigencia(
                    saved.getIdMoneda(), local.getIdMoneda(), fecha
            ).orElseGet(() -> {
                var t = new TipoDeCambio();
                t.setIdMonedaOrigen(saved.getIdMoneda());
                t.setIdMonedaDestino(local.getIdMoneda());
                t.setFechaVigencia(fecha);
                return t;
            });
            tc.setTasaCambio(dto.tasaCambioRespectoLocal());
            tcRepo.save(tc);
        }

        return toDTO(saved);
    }

    public MonedaDTO actualizar(Long id, MonedaActualizarDTO dto) {
        Moneda m = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Moneda no encontrada"));

        String nuevoCodigo = dto.codigo().trim().toUpperCase();
        String nuevoNombre = dto.nombre().trim();

        // Duplicado de código (excluyendo la misma)
        repo.findByCodigoMonedaIgnoreCase(nuevoCodigo).ifPresent(existente -> {
            if (!existente.getIdMoneda().equals(id)) {
                throw new IllegalArgumentException("Ya existe una moneda con código " + nuevoCodigo);
            }
        });

        // No permitir dejar inactiva a la moneda local
        if ((Boolean.TRUE.equals(m.getEsMonedaLocal()) || dto.esLocal())
                && !dto.estadoActivo()) {
            throw new IllegalArgumentException("La moneda local no puede inhabilitarse.");
        }

        // No permitir quitar el 'esLocal' si no existe otra que vaya a ser local
        if (Boolean.TRUE.equals(m.getEsMonedaLocal()) && !dto.esLocal()) {
            // Opciones:
            // 1) Bloquear:
            throw new IllegalArgumentException(
                    "Debe existir siempre una moneda local. Asigne otra como local antes de quitar este estado."
            );

            // 2) (alternativa) O promover otra a local aquí mismo – si tienes esa UX/DTO.
        }

        // Si pasa a local, desmarcar la local anterior
        if (!Boolean.TRUE.equals(m.getEsMonedaLocal()) && dto.esLocal()) {
            repo.findLocal().ifPresent(local -> {
                if (!local.getIdMoneda().equals(m.getIdMoneda())) {
                    local.setEsMonedaLocal(false);
                    repo.save(local);
                }
            });
        }

        m.setCodigoMoneda(nuevoCodigo);
        m.setNombreMoneda(nuevoNombre);
        m.setEsMonedaLocal(dto.esLocal());
        m.setEstadoActivo(dto.estadoActivo());

        Moneda saved = repo.save(m);

        // upsert TC si NO es local y enviaron tasa
        if (!saved.getEsMonedaLocal() && dto.tasaCambioRespectoLocal() != null) {
            if (dto.tasaCambioRespectoLocal().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("La tasa debe ser mayor a 0.");
            }
            Moneda local = repo.findLocal()
                    .orElseThrow(() -> new IllegalStateException("No hay moneda local definida."));
            LocalDate fecha = (dto.fechaVigencia() != null) ? dto.fechaVigencia() : LocalDate.now();

            var tc = tcRepo.findByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigencia(
                    saved.getIdMoneda(), local.getIdMoneda(), fecha
            ).orElseGet(() -> {
                var t = new TipoDeCambio();
                t.setIdMonedaOrigen(saved.getIdMoneda());
                t.setIdMonedaDestino(local.getIdMoneda());
                t.setFechaVigencia(fecha);
                return t;
            });
            tc.setTasaCambio(dto.tasaCambioRespectoLocal());
            tcRepo.save(tc);
        }

        return toDTO(saved);
    }

    public void eliminar(Long id) {
        Moneda m = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moneda no encontrada"));

        if (Boolean.TRUE.equals(m.getEsMonedaLocal())) {
            // No permitir eliminar la local
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La moneda local no puede eliminarse.");
        }

        boolean tieneRefs = tcRepo.existsByIdMonedaOrigenOrIdMonedaDestino(id, id);
        if (tieneRefs) {
            // 👉 NO hagas soft delete: devolvemos 409 y el front muestra mensaje
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se puede eliminar la moneda porque tiene tipos de cambio asociados."
            );
        }

        // Sin referencias: borrado físico
        repo.deleteById(id);
    }

    public MonedaDTO cambiarEstado(Long id, boolean activo) {
        Moneda m = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Moneda no encontrada"));
        if (Boolean.TRUE.equals(m.getEsMonedaLocal()) && !activo) {
            throw new IllegalArgumentException("La moneda local no puede inhabilitarse.");
        }
        m.setEstadoActivo(activo);
        return toDTO(repo.save(m));
    }

    // ------------ HELPERS ------------

    private MonedaDTO toDTO(Moneda m) {
        return new MonedaDTO(
                m.getIdMoneda(),
                m.getCodigoMoneda(),
                m.getNombreMoneda(),
                Boolean.TRUE.equals(m.getEsMonedaLocal()),
                m.isEstadoActivo(),
                null
        );
    }

    // MONEDA -> LOCAL; si no hay, LOCAL -> MONEDA (1/tasa)
    private BigDecimal tasaRespectoALocal(Long monedaId, Long localId, LocalDate hasta) {
        if (localId == null || monedaId == null) return null;

        var directa = tcRepo
                .findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
                        monedaId, localId, hasta
                )
                .map(TipoDeCambio::getTasaCambio)
                .orElse(null);
        if (directa != null) return directa;

        return tcRepo
                .findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
                        localId, monedaId, hasta
                )
                .map(tc -> BigDecimal.ONE.divide(tc.getTasaCambio(), 6, RoundingMode.HALF_UP))
                .orElse(null);
    }
}
