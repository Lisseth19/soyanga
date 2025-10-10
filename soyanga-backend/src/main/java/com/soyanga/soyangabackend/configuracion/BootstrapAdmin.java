package com.soyanga.soyangabackend.configuracion;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.RolServicio;
import com.soyanga.soyangabackend.servicio.seguridad.UsuarioServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.ArrayList;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class BootstrapAdmin implements CommandLineRunner {

    private final UsuarioServicio usuarioServicio;
    private final RolServicio rolServicio;

    @Override
    public void run(String... args) {
        final String USERNAME  = "admin";
        final String PASSWORD  = "admin123";
        final String ROLE_NAME = "ADMIN";

        // 1) Buscar o crear rol ADMIN
        RolRespuestaDTO rolAdmin = findRoleByExactName(ROLE_NAME);
        if (rolAdmin == null) {
            rolAdmin = rolServicio.crear(RolCrearDTO.builder()
                    .nombreRol(ROLE_NAME)                 // si tu DTO usa .nombre(), cámbialo aquí
                    .descripcion("Superadministrador")
                    .build());
        }
        final Long idRolAdmin = rolAdmin.getIdRol();

        // 2) Buscar o crear usuario admin
        UsuarioRespuestaDTO admin = findUserByExactUsername(USERNAME);
        if (admin == null) {
            admin = usuarioServicio.crear(UsuarioCrearDTO.builder()
                    .nombreUsuario(USERNAME)             // username
                    .contrasena(PASSWORD)                // cámbialo luego
                    .nombreCompleto("Admin Root")        // o .nombres("Admin").apellidos("Root")
                    .correoElectronico("admin@local")
                    .telefono("00000000")
                    .estadoActivo(true)
                    .build());
        }
        final Long idUsuario = admin.getIdUsuario();

        // 3) Cargar usuario con roles y decidir si hace falta asignar ADMIN
        UsuarioRespuestaDTO adminFull = usuarioServicio.obtener(idUsuario); // devuelve roles
        boolean tieneAdmin = false;
        final List<Long> rolesActuales = new ArrayList<>();

        if (adminFull.getRoles() != null) {
            for (UsuarioRespuestaDTO.RolMiniDTO r : adminFull.getRoles()) {
                if (r == null) continue;
                rolesActuales.add(r.getIdRol());
                if (idRolAdmin.equals(r.getIdRol())) {
                    tieneAdmin = true;
                }
            }
        }

        if (!tieneAdmin) {
            rolesActuales.add(idRolAdmin); // unión: roles actuales + ADMIN (sin duplicados)
            usuarioServicio.asignarRoles(
                    idUsuario,
                    UsuarioAsignarRolesDTO.builder()
                            .rolesIds(rolesActuales) // si tu DTO usa idsRoles, cámbialo a .idsRoles(…)
                            .build()
            );
        }

        System.out.println("=== Usuario inicial listo: " + USERNAME + " / " + PASSWORD + " ===");
    }

    private RolRespuestaDTO findRoleByExactName(String name) {
        Page<RolRespuestaDTO> page = rolServicio.listar(name, PageRequest.of(0, 50));
        if (page == null || page.getContent() == null) return null;
        for (RolRespuestaDTO r : page.getContent()) {
            if (r != null && name.equalsIgnoreCase(r.getNombreRol())) return r;
        }
        return null;
    }

    private UsuarioRespuestaDTO findUserByExactUsername(String username) {
        Page<UsuarioRespuestaDTO> page = usuarioServicio.listar(username, false, PageRequest.of(0, 50));
        if (page == null || page.getContent() == null) return null;
        for (UsuarioRespuestaDTO u : page.getContent()) {
            if (u != null && username.equalsIgnoreCase(u.getNombreUsuario())) return u;
        }
        return null;
    }
}
