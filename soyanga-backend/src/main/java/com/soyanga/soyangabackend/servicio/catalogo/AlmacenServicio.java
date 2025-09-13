package com.soyanga.soyangabackend.servicio.catalogo;

import com.soyanga.soyangabackend.dominio.Almacen;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenCrearDTO;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenEditarDTO;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenListadoProjection;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenRespuestaDTO;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.repositorio.catalogo.AlmacenRepositorio;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AlmacenServicio {

    private final AlmacenRepositorio repo;

    public Page<AlmacenListadoProjection> listar(String q, Long idSucursal, boolean incluirInactivos,
            Pageable pageable) {
        String filtro = (q == null || q.isBlank()) ? null : q.trim();
        return repo.listar(filtro, idSucursal, incluirInactivos, pageable);
    }

    public AlmacenRespuestaDTO obtener(Long id) {
        var a = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Almacén no encontrado: " + id));

        return AlmacenRespuestaDTO.builder()
                .idAlmacen(a.getIdAlmacen())
                .idSucursal(a.getIdSucursal())
                // si quieres el nombre de la sucursal aquí, añadimos luego un query con JOIN
                .sucursal(null)
                .nombreAlmacen(a.getNombreAlmacen())
                .descripcion(a.getDescripcion())
                .estadoActivo(a.getEstadoActivo())
                .build();
    }

    public AlmacenRespuestaDTO crear(AlmacenCrearDTO dto) {
        var a = Almacen.builder()
                .idSucursal(dto.getIdSucursal())
                .nombreAlmacen(dto.getNombreAlmacen())
                .descripcion(dto.getDescripcion())
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();
        a = repo.save(a);
        return obtener(a.getIdAlmacen());
    }

    public AlmacenRespuestaDTO editar(Long id, AlmacenEditarDTO dto) {
        var a = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Almacén no encontrado: " + id));

        a.setIdSucursal(dto.getIdSucursal());
        a.setNombreAlmacen(dto.getNombreAlmacen());
        a.setDescripcion(dto.getDescripcion());
        a.setEstadoActivo(dto.getEstadoActivo());

        repo.save(a);
        return obtener(id);
    }

    public void eliminar(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Almacén no encontrado: " + id);
        }
        repo.deleteById(id);
    }

    /**
     * Opciones para combos:
     * - si mandas idSucursal -> usa existencias activas de esa sucursal
     * - si no mandas -> usa el query nativo opciones(soloActivos)
     */
    public List<OpcionIdNombre> opciones(boolean incluirInactivos, Long idSucursal) {
        if (idSucursal != null) {
            // Mantén solo activos para combos por sucursal (comportamiento actual)
            return repo.findByIdSucursalAndEstadoActivoTrue(idSucursal).stream()
                    .map(a -> OpcionIdNombre.builder().id(a.getIdAlmacen()).nombre(a.getNombreAlmacen()).build())
                    .toList();
        }
        return repo.opciones(incluirInactivos);
    }

    @Transactional
    public void cambiarEstado(Long id, boolean activo) {
        // 2 opciones:
        // A) update directo en repo (mejor rendimiento) — ver método en el repositorio
        // abajo
        int updated = repo.updateEstado(id, activo);
        if (updated == 0) {
            throw new IllegalArgumentException("Almacén no encontrado: " + id);
        }

        // B) Alternativa si prefieres cargar entidad:
        // var alm = repo.findById(id).orElseThrow(() -> new
        // IllegalArgumentException("Almacén no encontrado: " + id));
        // alm.setEstadoActivo(activo);
        // repo.save(alm);
    }
}
