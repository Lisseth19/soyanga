package com.soyanga.soyangabackend.servicio.archivos;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Optional;

@Service
public class StorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public String savePresentacionImage(Long idPresentacion, MultipartFile file) throws IOException {
        String ext = Optional.ofNullable(file.getOriginalFilename())
                .filter(n -> n.contains("."))
                .map(n -> n.substring(n.lastIndexOf('.') + 1))
                .orElse("jpg");

        Path dir = Path.of(uploadDir, "presentaciones", String.valueOf(idPresentacion));
        Files.createDirectories(dir);

        // Borra anteriores imágenes si hubiera
        try (var s = Files.list(dir)) {
            s.forEach(p -> {
                if (p.getFileName().toString().startsWith("imagen.")) {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException ignored) {
                    }
                }
            });
        }

        Path path = dir.resolve("imagen." + ext);
        Files.write(path, file.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        // URL pública
        return "/static/presentaciones/" + idPresentacion + "/imagen." + ext;
    }

    public void deletePresentacionImage(Long idPresentacion) throws IOException {
        Path dir = Path.of(uploadDir, "presentaciones", String.valueOf(idPresentacion));
        if (!Files.exists(dir))
            return;
        try (var s = Files.list(dir)) {
            s.forEach(p -> {
                if (p.getFileName().toString().startsWith("imagen.")) {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException ignored) {
                    }
                }
            });
        }
    }
}
