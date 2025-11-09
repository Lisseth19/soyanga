package com.soyanga.soyangabackend.configuracion;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import com.soyanga.soyangabackend.servicio.seguridad.RolServicio;
import com.soyanga.soyangabackend.servicio.seguridad.UsuarioServicio;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.bootstrap.admin.enabled", havingValue = "true", matchIfMissing = true)
public class BootstrapAdmin implements ApplicationRunner {

    private final UsuarioRepositorio usuarioRepo;
    private final UsuarioServicio usuarioServicio;
    private final RolServicio rolServicio;

    @Value("${app.bootstrap.admin.username:admin}")
    private String adminUsername;

    @Value("${app.bootstrap.admin.email:admin@local}")
    private String adminEmail;

    @Value("${app.bootstrap.admin.password:Admin12345}")
    private String adminPassword;

    @Value("${app.bootstrap.admin.rol:ADMIN}")
    private String adminRoleName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // ¿Es el primer arranque? (no hay usuarios)
        boolean firstBoot = usuarioRepo.count() == 0;

        // 1) Rol ADMIN (buscar por nombre exacto; si no existe, crear)
        Long idRolAdmin = findOrCreateAdminRole(adminRoleName);

        // 2) Usuario admin (buscar directo en repo)
        var existente = usuarioRepo.findByNombreUsuarioIgnoreCase(adminUsername)
                .or(() -> usuarioRepo.findByCorreoElectronicoIgnoreCase(adminEmail))
                .orElse(null);

        UsuarioRespuestaDTO adminDTO;
        if (existente == null) {
            log.info("[BootstrapAdmin] Creando usuario admin inicial: {} / {}", adminUsername, adminEmail);
            adminDTO = usuarioServicio.crear(UsuarioCrearDTO.builder()
                    .nombreUsuario(adminUsername)
                    .contrasena(adminPassword)
                    .nombreCompleto("Administrador")
                    .correoElectronico(adminEmail)
                    .telefono("00000000")
                    .estadoActivo(true)
                    .build());
        } else {
            log.info("[BootstrapAdmin] Admin ya existe: {} / {}. No se crea nuevamente.", adminUsername, adminEmail);
            adminDTO = usuarioServicio.obtener(existente.getIdUsuario());
        }

        // 3) Asegurar que tiene el rol ADMIN (unir con roles actuales sin duplicar)
        var rolesActuales = new ArrayList<Long>();
        boolean yaEsAdmin = false;
        if (adminDTO.getRoles() != null) {
            for (UsuarioRespuestaDTO.RolMiniDTO r : adminDTO.getRoles()) {
                if (r == null) continue;
                rolesActuales.add(r.getIdRol());
                if (r.getIdRol().equals(idRolAdmin)) yaEsAdmin = true;
            }
        }

        if (!yaEsAdmin) {
            rolesActuales.add(idRolAdmin);

            Authentication prev = SecurityContextHolder.getContext().getAuthentication();
            try {
                if (firstBoot) {
                    // Impersonación temporal SOLO en primer arranque
                    var fakeAdmin = new UsernamePasswordAuthenticationToken(
                            "bootstrap", "N/A",
                            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(fakeAdmin);
                    log.info("[BootstrapAdmin] (primer arranque) Impersonación temporal ROLE_ADMIN para asignar rol al admin.");
                }

                usuarioServicio.asignarRoles(
                        adminDTO.getIdUsuario(),
                        UsuarioAsignarRolesDTO.builder().rolesIds(rolesActuales).build()
                );
                log.info("[BootstrapAdmin] Asignado rol {} al admin.", adminRoleName);
            } finally {
                // Restaurar contexto de seguridad
                if (prev != null) {
                    SecurityContextHolder.getContext().setAuthentication(prev);
                } else {
                    SecurityContextHolder.clearContext();
                }
            }
        }

        log.info("=== Usuario inicial listo: {} / {} ===", adminUsername, adminPassword);
    }

    private Long findOrCreateAdminRole(String roleName) {
        var page = rolServicio.listar(roleName, org.springframework.data.domain.PageRequest.of(0, 50));
        var encontrado = page.getContent().stream()
                .filter(r -> r != null && roleName.equalsIgnoreCase(r.getNombreRol()))
                .findFirst()
                .orElse(null);
        if (encontrado != null) return encontrado.getIdRol();

        var creado = rolServicio.crear(RolCrearDTO.builder()
                .nombreRol(roleName)
                .descripcion("Rol de superadministrador")
                .build());
        return creado.getIdRol();
    }
}
