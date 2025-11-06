package com.soyanga.soyangabackend.web.clientes;

import com.soyanga.soyangabackend.dto.clientes.ClienteCrearDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteEditarDTO;
import com.soyanga.soyangabackend.dto.clientes.ClienteRespuestaDTO;
import com.soyanga.soyangabackend.servicio.clientes.ClienteServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteControlador {

    private final ClienteServicio servicio;

    /** Mapa atributo JPA -> nombre de columna (para consultas nativas). */
    private static final Map<String, String> ATRIBUTO_A_COLUMNA = new HashMap<>() {{
        put("idCliente", "id_cliente");
        put("razonSocialONombre", "razon_social_o_nombre");
        put("nit", "nit");
        put("telefono", "telefono");
        put("correoElectronico", "correo_electronico");
        put("direccion", "direccion");
        put("ciudad", "ciudad");
        put("condicionDePago", "condicion_de_pago");
        put("limiteCreditoBob", "limite_credito_bob");
        put("estadoActivo", "estado_activo");
    }};

    /** Acepta sort como "campo,asc|desc" con nombres de ATRIBUTO o COLUMNA; devuelve Sort en nombre de columna. */
    private Sort parseSort(String sortRaw) {
        String defCampoCol = "razon_social_o_nombre";
        if (sortRaw == null || sortRaw.isBlank()) {
            return Sort.by(Sort.Order.asc(defCampoCol));
        }
        try {
            String[] parts = sortRaw.split(",", 2);
            String campoEntrada = parts[0].trim();
            String dir = parts.length > 1 ? parts[1].trim().toLowerCase() : "asc";

            String campoColumna = ATRIBUTO_A_COLUMNA.getOrDefault(campoEntrada, campoEntrada);
            boolean esColumnaConocida = ATRIBUTO_A_COLUMNA.containsValue(campoColumna);
            if (!esColumnaConocida) campoColumna = defCampoCol;

            return "desc".equals(dir)
                    ? Sort.by(Sort.Order.desc(campoColumna))
                    : Sort.by(Sort.Order.asc(campoColumna));
        } catch (Exception ignored) {
            return Sort.by(Sort.Order.asc(defCampoCol));
        }
    }

    /* ====== Endpoints ====== */

    @GetMapping
    @PreAuthorize("@perms.tiene(authentication, 'clientes:ver')")
    public Page<ClienteRespuestaDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean soloActivos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false, name = "sort") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        return servicio.listar(q, soloActivos, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'clientes:ver')")
    public ClienteRespuestaDTO obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perms.tiene(authentication, 'clientes:crear')")
    public ClienteRespuestaDTO crear(@Valid @RequestBody ClienteCrearDTO dto) {
        return servicio.crear(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perms.tiene(authentication, 'clientes:actualizar')")
    public ClienteRespuestaDTO editar(@PathVariable Long id, @Valid @RequestBody ClienteEditarDTO dto) {
        return servicio.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perms.tiene(authentication, 'clientes:eliminar')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("@perms.tiene(authentication, 'clientes:actualizar')")
    public ClienteRespuestaDTO cambiarEstado(@PathVariable Long id, @RequestBody CambiarEstadoReq req) {
        return servicio.cambiarEstado(id, req.activo());
    }

    /* Opcionales (compatibilidad), usan el mismo permiso 'clientes:actualizar' */
    @Deprecated
    @PatchMapping("/{id}/activar")
    @PreAuthorize("@perms.tiene(authentication, 'clientes:actualizar')")
    public ClienteRespuestaDTO activar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, true);
    }

    @Deprecated
    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("@perms.tiene(authentication, 'clientes:actualizar')")
    public ClienteRespuestaDTO desactivar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, false);
    }

    public record CambiarEstadoReq(boolean activo) {}
}
