package com.soyanga.soyangabackend.seguridad;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component("perms")
public class Perms {
    public boolean tiene(Authentication auth, String permiso) {
        if (auth == null || !auth.isAuthenticated()) return false;

        var list = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        //  LOG de depuración
//        System.out.println("[PERMS] solicitando = " + permiso);
//        System.out.println("[PERMS] authorities = " + list);

        // Bypass por rol ADMIN (opcional pero muy útil)
        boolean esAdmin = list.stream().anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a));
        if (esAdmin) return true;

        return list.contains(permiso);
    }
}
