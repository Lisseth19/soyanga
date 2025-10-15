package com.soyanga.soyangabackend.seguridad;

import org.springframework.security.access.prepost.PreAuthorize;
import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@perms.tiene(authentication, #valor + ':ver')")
public @interface RequiereVer {
    String valor();
}
