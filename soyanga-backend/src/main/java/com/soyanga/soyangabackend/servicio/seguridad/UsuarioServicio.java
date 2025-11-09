package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dominio.Usuario;
import com.soyanga.soyangabackend.dominio.UsuarioRol;
import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.repositorio.seguridad.RolRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRolRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioServicio {

    private final UsuarioRepositorio repo;
    private final UsuarioRolRepositorio userRolRepo;
    private final RolRepositorio rolRepo;
    private final PasswordEncoder passwordEncoder;

    // NUEVO: servicio real de reset por email
    private final PasswordResetServicio passwordResetServicio;

    /* ================== Helpers de seguridad ================== */
    private Long getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        String username = auth.getName(); // username del token
        return repo.findByNombreUsuarioIgnoreCase(username)
                .map(Usuario::getIdUsuario)
                .orElse(null);
    }

    private boolean usuarioTieneRolAdmin(Long idUsuario) {
        if (idUsuario == null) return false;
        var asignaciones = userRolRepo.findByIdUsuario(idUsuario);
        for (var ur : asignaciones) {
            var rolOpt = rolRepo.findById(ur.getIdRol());
            if (rolOpt.isPresent()) {
                String nombre = String.valueOf(rolOpt.get().getNombreRol());
                if (nombre != null && nombre.toUpperCase().contains("ADMIN")) return true;
            }
        }
        return false;
    }

    private void asegurarActorPuedeOperarSobre(Long targetId) {
        Long actorId = getCurrentUserId();
        boolean targetEsAdmin = usuarioTieneRolAdmin(targetId);
        boolean actorEsAdmin = usuarioTieneRolAdmin(actorId);
        if (targetEsAdmin && !actorEsAdmin) {
            throw new AccessDeniedException("No puedes operar sobre un usuario ADMIN.");
        }
    }

    /* ================== Consultas ================== */

    public Page<UsuarioRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        Long actorId = getCurrentUserId();
        boolean actorEsAdmin = usuarioTieneRolAdmin(actorId);

        // Si NO es admin, excluye usuarios ADMIN desde BD
        boolean excluirAdmins = !actorEsAdmin;

        var page = repo.listar(
                (q == null || q.isBlank()) ? null : q.trim(),
                soloActivos,
                excluirAdmins,
                pageable
        );

        return page.map(p -> UsuarioRespuestaDTO.builder()
                .idUsuario(p.getIdUsuario())
                .nombreCompleto(p.getNombreCompleto())
                .correoElectronico(p.getCorreoElectronico())
                .telefono(p.getTelefono())
                .nombreUsuario(p.getNombreUsuario())
                .estadoActivo(p.getEstadoActivo())
                .roles(List.of()) // si quieres enriquecer, carga roles aparte
                .build());
    }

    public UsuarioRespuestaDTO obtener(Long id) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        return toDTOConRoles(u);
    }

    /* ================== Comandos ================== */

    @Transactional
    public UsuarioRespuestaDTO crear(UsuarioCrearDTO dto) {
        repo.findByCorreoElectronicoIgnoreCase(dto.getCorreoElectronico())
                .ifPresent(x -> { throw new IllegalArgumentException("Correo ya registrado"); });
        repo.findByNombreUsuarioIgnoreCase(dto.getNombreUsuario())
                .ifPresent(x -> { throw new IllegalArgumentException("Nombre de usuario ya registrado"); });

        var u = Usuario.builder()
                .nombreCompleto(dto.getNombreCompleto())
                .correoElectronico(dto.getCorreoElectronico())
                .telefono(dto.getTelefono())
                .nombreUsuario(dto.getNombreUsuario())
                .contrasenaHash(passwordEncoder.encode(dto.getContrasena()))
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();

        u = repo.save(u);
        return toDTOConRoles(u);
    }

    @Transactional
    public UsuarioRespuestaDTO editar(Long id, UsuarioEditarDTO dto) {
        asegurarActorPuedeOperarSobre(id);

        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));

        if (!u.getCorreoElectronico().equalsIgnoreCase(dto.getCorreoElectronico())) {
            repo.findByCorreoElectronicoIgnoreCase(dto.getCorreoElectronico())
                    .ifPresent(x -> { throw new IllegalArgumentException("Correo ya registrado"); });
        }
        if (!u.getNombreUsuario().equalsIgnoreCase(dto.getNombreUsuario())) {
            repo.findByNombreUsuarioIgnoreCase(dto.getNombreUsuario())
                    .ifPresent(x -> { throw new IllegalArgumentException("Nombre de usuario ya registrado"); });
        }

        u.setNombreCompleto(dto.getNombreCompleto());
        u.setCorreoElectronico(dto.getCorreoElectronico());
        u.setTelefono(dto.getTelefono());
        u.setNombreUsuario(dto.getNombreUsuario());
        if (dto.getEstadoActivo() != null) u.setEstadoActivo(dto.getEstadoActivo());

        u = repo.save(u);
        return toDTOConRoles(u);
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("Usuario no encontrado: " + id);

        Long me = getCurrentUserId();
        if (me != null && Objects.equals(me, id)) {
            throw new AccessDeniedException("No puedes eliminarte a ti mismo.");
        }

        asegurarActorPuedeOperarSobre(id);

        userRolRepo.deleteByIdUsuario(id);
        repo.deleteById(id);
    }

    @Transactional
    public void cambiarPassword(Long id, UsuarioCambiarPasswordDTO dto) {
        var u = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));

        Long actorId = getCurrentUserId();
        boolean actorEsAdmin = usuarioTieneRolAdmin(actorId);
        boolean targetEsAdmin = usuarioTieneRolAdmin(id);

        if (targetEsAdmin && !actorEsAdmin && !Objects.equals(actorId, id)) {
            throw new AccessDeniedException("No puedes operar sobre un usuario ADMIN.");
        }

        // RESET POR EMAIL (admin)
        if (Boolean.TRUE.equals(dto.getResetPorEmail())) {
            if (!actorEsAdmin) {
                throw new AccessDeniedException("Solo un ADMIN puede solicitar restablecer contraseña por email.");
            }
            enviarResetPorEmail(u, actorId);
            return; // 204
        }

        // CAMBIO NORMAL (el propio usuario)
        if (!Objects.equals(actorId, id)) {
            throw new AccessDeniedException("No puedes cambiar directamente la contraseña de otro usuario. Usa restablecimiento por email.");
        }

        if (dto.getContrasenaActual() == null || dto.getContrasenaActual().isBlank()) {
            throw new IllegalArgumentException("Debes ingresar la contraseña actual");
        }
        if (!passwordEncoder.matches(dto.getContrasenaActual(), u.getContrasenaHash())) {
            throw new IllegalArgumentException("Contraseña actual incorrecta");
        }

        var nueva = dto.getNuevaContrasena();
        if (nueva == null || nueva.isBlank()) {
            throw new IllegalArgumentException("La nueva contraseña es obligatoria");
        }
        if (nueva.length() < 8) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 8 caracteres");
        }
        if (passwordEncoder.matches(nueva, u.getContrasenaHash())) {
            throw new IllegalArgumentException("La nueva contraseña no puede ser igual a la actual");
        }

        u.setContrasenaHash(passwordEncoder.encode(nueva));
        repo.save(u);
    }

    @Transactional
    public UsuarioRespuestaDTO asignarRoles(Long idUsuario, UsuarioAsignarRolesDTO dto) {
        asegurarActorPuedeOperarSobre(idUsuario);

        Long actorId = getCurrentUserId();
        boolean actorEsAdmin = usuarioTieneRolAdmin(actorId);

        // Normaliza lista de roles desde rolesIds o (fallback) getRoles()
        List<Long> roles = dto.getRolesIds();
        if (roles == null || roles.isEmpty()) {
            try {
                var m = dto.getClass().getMethod("getRoles");
                Object val = m.invoke(dto);
                if (val instanceof List<?> l) {
                    roles = l.stream().filter(Objects::nonNull).map(x -> (Long) x).collect(Collectors.toList());
                }
            } catch (Exception ignored) {}
        }
        if (roles == null) roles = List.of();
        roles = roles.stream().filter(Objects::nonNull).distinct().toList();

        // Obtiene nombres de roles para detectar ADMIN
        final Set<String> nuevosNombres = new HashSet<>();
        for (Long idRol : roles) {
            var rol = rolRepo.findById(idRol)
                    .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + idRol));
            nuevosNombres.add(String.valueOf(rol.getNombreRol()).toUpperCase());
        }
        boolean intentaAsignarAdmin = nuevosNombres.stream().anyMatch(n -> n.contains("ADMIN"));

        // --- EXCEPCIÓN DE PRIMER ARRANQUE ---
        // Permitimos asignar ADMIN si la BD está "vacía" (0 o 1 usuario, típico del bootstrap).
        long totalUsuarios = repo.count();
        boolean esPrimerArranque = (totalUsuarios <= 1);

        if (!actorEsAdmin) {
            // Si NO es admin, solo se permite ADMIN en primer arranque.
            if (intentaAsignarAdmin && !esPrimerArranque) {
                throw new AccessDeniedException("No puedes asignar el rol ADMIN.");
            }
            // Si el target ya era ADMIN, un no-admin no puede modificar sus roles.
            boolean targetEraAdmin = usuarioTieneRolAdmin(idUsuario);
            if (targetEraAdmin && !esPrimerArranque) {
                throw new AccessDeniedException("No puedes modificar roles de un usuario ADMIN.");
            }
        }

        // Reemplaza asignaciones (evitando duplicados)
        userRolRepo.deleteByIdUsuario(idUsuario);
        for (Long idRol : roles) {
            if (!userRolRepo.existsByIdUsuarioAndIdRol(idUsuario, idRol)) {
                userRolRepo.save(UsuarioRol.builder()
                        .idUsuario(idUsuario)
                        .idRol(idRol)
                        .build());
            }
        }

        var u = repo.findById(idUsuario)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + idUsuario));
        return toDTOConRoles(u);
    }

    @Transactional
    public void cambiarEstado(Long id, boolean activo) {
        Long me = getCurrentUserId();
        if (me != null && Objects.equals(me, id)) {
            throw new AccessDeniedException("No puedes desactivarte a ti mismo.");
        }

        asegurarActorPuedeOperarSobre(id);

        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        u.setEstadoActivo(activo);
        repo.save(u);
    }

    /* ================== Helpers internos ================== */

    private UsuarioRespuestaDTO toDTOConRoles(Usuario u) {
        var asignaciones = userRolRepo.findByIdUsuario(u.getIdUsuario());
        var rolesMini = new ArrayList<UsuarioRespuestaDTO.RolMiniDTO>();
        for (var ur : asignaciones) {
            rolRepo.findById(ur.getIdRol()).ifPresent(r ->
                    rolesMini.add(UsuarioRespuestaDTO.RolMiniDTO.builder()
                            .idRol(r.getIdRol())
                            .nombreRol(r.getNombreRol())
                            .build()));
        }
        return UsuarioRespuestaDTO.builder()
                .idUsuario(u.getIdUsuario())
                .nombreCompleto(u.getNombreCompleto())
                .correoElectronico(u.getCorreoElectronico())
                .telefono(u.getTelefono())
                .nombreUsuario(u.getNombreUsuario())
                .estadoActivo(u.getEstadoActivo())
                .roles(rolesMini)
                .build();
    }

    /**
     * Ahora delega al servicio real que genera token + envía el email.
     */
    private void enviarResetPorEmail(Usuario u, Long solicitadoPorId) {
        passwordResetServicio.iniciarReset(u, solicitadoPorId);
    }

    /* ========= (Opcional) endpoint de servicio si usas /password-reset ========= */
    @Transactional
    public void solicitarResetPorEmail(Long targetUserId) {
        Long actorId = getCurrentUserId();
        if (!usuarioTieneRolAdmin(actorId)) {
            throw new AccessDeniedException("Solo ADMIN puede solicitar restablecimiento por email.");
        }
        var u = repo.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + targetUserId));
        passwordResetServicio.iniciarReset(u, actorId);
    }
}
