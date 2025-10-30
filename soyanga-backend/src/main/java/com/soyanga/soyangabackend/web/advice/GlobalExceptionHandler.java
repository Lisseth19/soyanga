package com.soyanga.soyangabackend.web.advice;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    static final class ApiError {
        private final int status;
        private final String error;
        private final String message;
        private final String path;
        private final String timestamp;
        private final Map<String, Object> errors;

        ApiError(HttpStatus status, String message, String path, Map<String, Object> errors) {
            this.status = status.value();
            this.error = status.getReasonPhrase();
            this.message = message;
            this.path = path;
            this.timestamp = OffsetDateTime.now().toString();
            this.errors = errors;
        }

        public int getStatus() {
            return status;
        }

        public String getError() {
            return error;
        }

        public String getMessage() {
            return message;
        }

        public String getPath() {
            return path;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public Map<String, Object> getErrors() {
            return errors;
        }
    }

    /* 401: credenciales inválidas (lanzadas en controlador/servicio) */
    @ExceptionHandler({ BadCredentialsException.class, UsernameNotFoundException.class, AuthenticationException.class })
    public ResponseEntity<ApiError> handleCredenciales(Exception ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.UNAUTHORIZED, "Usuario o contraseña inválidos", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    /* 423: usuario deshabilitado */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.LOCKED, "Usuario deshabilitado", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.LOCKED).body(body);
    }

    /* 403: sin permisos (si se lanza desde código de aplicación) */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.FORBIDDEN, "Acceso denegado", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /* 400: validaciones @Valid (DTOs) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> errs = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errs.put(fe.getField(), fe.getDefaultMessage());
        }
        var body = new ApiError(HttpStatus.BAD_REQUEST, "Validación fallida", req.getRequestURI(), errs);
        return ResponseEntity.badRequest().body(body);
    }

    /* 400: parámetros de path/query mal tipados (?page=abc, etc.) */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        var msg = "Parámetro inválido: " + ex.getName();
        var body = new ApiError(HttpStatus.BAD_REQUEST, msg, req.getRequestURI(), Map.of(
                "param", ex.getName(),
                "value", String.valueOf(ex.getValue()),
                "requiredType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "desconocido"));
        return ResponseEntity.badRequest().body(body);
    }

    /* 400: argumentos inválidos de tu lógica */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArg(IllegalArgumentException ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.BAD_REQUEST, ex.getMessage(), req.getRequestURI(), null);
        return ResponseEntity.badRequest().body(body);
    }

    /* 400: violaciones de integridad (duplicados, FK, UNIQUE, NOT NULL) */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        String msg = "Violación de integridad de datos";
        String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (raw != null) {
            String low = raw.toLowerCase();
            if (low.contains("uk_roles_nombre") || low.contains("nombre_rol")) {
                msg = "Nombre de rol ya existe.";
            } else if (low.contains("uk_usuario_rol") || low.contains("usuarios_roles")) {
                msg = "Asignación duplicada usuario-rol.";
            } else if (low.contains("uk_permisos_nombre") || (low.contains("permisos") && low.contains("unique"))) {
                msg = "Permiso duplicado.";
            } else if (low.contains("not null")) {
                msg = "Campo requerido ausente.";
            }
        }
        var body = new ApiError(HttpStatus.BAD_REQUEST, msg, req.getRequestURI(), null);
        return ResponseEntity.badRequest().body(body);
    }

    /* 400: violaciones de bean validation (Jakarta) */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleJakartaConstraint(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, Object> errs = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(cv -> errs.put(cv.getPropertyPath().toString(), cv.getMessage()));
        var body = new ApiError(HttpStatus.BAD_REQUEST, "Violación de restricciones", req.getRequestURI(), errs);
        return ResponseEntity.badRequest().body(body);
    }

    /* 400: Hibernate ConstraintViolation (si llega sin envolver) */
    @ExceptionHandler(org.hibernate.exception.ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleHibernateConstraint(org.hibernate.exception.ConstraintViolationException ex,
            HttpServletRequest req) {
        var body = new ApiError(HttpStatus.BAD_REQUEST, "Violación de restricción de base de datos",
                req.getRequestURI(), null);
        return ResponseEntity.badRequest().body(body);
    }

    /* 500: genérico (lo no manejado) */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAll(Exception ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", req.getRequestURI(),
                null);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
