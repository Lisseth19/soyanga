package com.soyanga.soyangabackend.seguridad;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class AuthUtils {
    private AuthUtils() {
    }

    public static String currentUsername() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.isAuthenticated() && a.getName() != null) {
            return a.getName();
        }
        return "sistema"; // fallback cuando no hay sesión (jobs, etc.)
    }
}
