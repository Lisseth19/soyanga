package com.soyanga.soyangabackend.configuracion;

import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://192.168.*:*",
                        "http://192.168.2.103:5173/")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowCredentials(true);
    }

    // ===== NUEVO =====
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // file:/// + ruta absoluta (con barras) y slash final
        String absolute = Paths.get(uploadDir).toAbsolutePath().toString().replace("\\", "/");
        registry.addResourceHandler("/static/**")
                .addResourceLocations("file:///" + absolute + "/");
        // Ej: /static/presentaciones/2/imagen.jpeg ->
        // C:/soyanga/uploads/presentaciones/2/imagen.jpeg
    }
}
