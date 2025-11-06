package com.soyanga.soyangabackend.seguridad;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component("perms")
public class Perms {

    private static final String ROLE_ADMIN = "role_admin";
    private static final String ROLE_ANON  = "role_anonymous";

    public boolean tiene(Authentication auth, String permiso) {
        if (auth == null || !auth.isAuthenticated()) return false;

        Set<String> granted = normalizedLower(auth);
        if (granted.contains(ROLE_ANON)) return false;      // deny explícito a anónimos
        if (granted.contains(ROLE_ADMIN)) return true;      // admin real

        String wanted = permiso == null ? "" : permiso.trim().toLowerCase(Locale.ROOT);
        if (wanted.isEmpty()) return false;

        // match exacto (case normalizado)
        if (granted.contains(wanted)) return true;

        // Si quieres wildcard, descomenta y **asegúrate** de no emitir "usuarios:*" a cualquiera
        // return matchesWildcard(granted, wanted);

        return false;
    }

    public boolean tieneAny(Authentication auth, String... permisos) {
        if (auth == null || !auth.isAuthenticated() || permisos == null) return false;
        Set<String> g = normalizedLower(auth);
        if (g.contains(ROLE_ANON) || g.contains(ROLE_ADMIN)) return g.contains(ROLE_ADMIN);
        for (String p : permisos) {
            if (p != null && g.contains(p.trim().toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    public boolean tieneAll(Authentication auth, String... permisos) {
        if (auth == null || !auth.isAuthenticated() || permisos == null) return false;
        Set<String> g = normalizedLower(auth);
        if (g.contains(ROLE_ANON)) return false;
        if (g.contains(ROLE_ADMIN)) return true;
        for (String p : permisos) {
            if (p == null || !g.contains(p.trim().toLowerCase(Locale.ROOT))) return false;
        }
        return true;
    }

    private Set<String> normalizedLower(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(Objects::nonNull)
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @SuppressWarnings("unused")
    private boolean matchesWildcard(Set<String> granted, String wantedLower) {
        int idx = wantedLower.indexOf(':');
        if (idx <= 0) return false;
        String wildcard = wantedLower.substring(0, idx + 1) + "*"; // "usuarios:*"
        return granted.contains(wantedLower) || granted.contains(wildcard);
    }
}
