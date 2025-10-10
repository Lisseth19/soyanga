package com.soyanga.soyangabackend.seguridad;

import org.springframework.security.access.prepost.PreAuthorize;
import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@perms.tiene(authentication, #valor + ':actualizar')")
public @interface RequiereActualizar {
    String valor();
}
