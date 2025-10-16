package com.soyanga.soyangabackend.servicio.archivos;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Locale;
import java.util.Optional;

@Service
public class StorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10MB

    /**
     * Guarda la imagen de una presentación con nombre versionado (imagen_{ts}.ext)
     * y devuelve la URL pública servida por Spring bajo /uploads/**.
     */
    public String savePresentacionImage(Long idPresentacion, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("El archivo excede 10MB");
        }
        final String ctype = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (!ctype.startsWith("image/")) {
            throw new IllegalArgumentException("Sólo se permiten imágenes");
        }

        // 1) Resolver extensión (por nombre o content-type)
        String ext = Optional.ofNullable(file.getOriginalFilename())
                .filter(n -> n.contains("."))
                .map(n -> n.substring(n.lastIndexOf('.') + 1))
                .map(s -> s.toLowerCase(Locale.ROOT))
                .orElseGet(() -> {
                    if (ctype.endsWith("png")) return "png";
                    if (ctype.endsWith("jpeg") || ctype.endsWith("jpg")) return "jpg";
                    if (ctype.endsWith("webp")) return "webp";
                    if (ctype.endsWith("gif")) return "gif";
                    return "jpg";
                });

        // 2) Directorio destino
        Path dir = Path.of(uploadDir, "presentaciones", String.valueOf(idPresentacion))
                .toAbsolutePath().normalize();
        Files.createDirectories(dir);

        // 3) Limpiar versiones anteriores imagen_* (si existen)
        try (var s = Files.list(dir)) {
            s.forEach(p -> {
                String name = p.getFileName().toString().toLowerCase(Locale.ROOT);
                if (name.startsWith("imagen_")) {
                    try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                }
            });
        }

        // 4) Nombre versionado y escritura atómica
        String filename = "imagen_" + System.currentTimeMillis() + "." + ext;
        Path tmp = dir.resolve(filename + ".tmp");
        Path target = dir.resolve(filename);

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, tmp, StandardCopyOption.REPLACE_EXISTING);
        }
        // move atómico
        Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        // 5) URL pública
        return "/uploads/presentaciones/" + idPresentacion + "/" + filename;
    }

    public void deletePresentacionImage(Long idPresentacion) throws IOException {
        Path dir = Path.of(uploadDir, "presentaciones", String.valueOf(idPresentacion))
                .toAbsolutePath().normalize();
        if (!Files.exists(dir)) return;

        try (var s = Files.list(dir)) {
            s.forEach(p -> {
                String name = p.getFileName().toString().toLowerCase(Locale.ROOT);
                if (name.startsWith("imagen_")) {
                    try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                }
            });
        }
    }
}
