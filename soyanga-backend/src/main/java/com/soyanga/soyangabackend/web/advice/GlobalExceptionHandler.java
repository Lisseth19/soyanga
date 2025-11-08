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

import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.extern.slf4j.Slf4j;

@Slf4j
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

        public int getStatus() { return status; }
        public String getError() { return error; }
        public String getMessage() { return message; }
        public String getPath() { return path; }
        public String getTimestamp() { return timestamp; }
        public Map<String, Object> getErrors() { return errors; }
    }

    private static Throwable rootCause(Throwable t) {
        Throwable r = t;
        while (r.getCause() != null && r.getCause() != r) r = r.getCause();
        return r;
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static Map<String, Object> dbDetails(Throwable ex) {
        Map<String, Object> map = new LinkedHashMap<>();
        Throwable root = rootCause(ex);

        // Postgres driver
        try {
            Class<?> psqlEx = Class.forName("org.postgresql.util.PSQLException");
            if (psqlEx.isInstance(root)) {
                var sqlState = (String) psqlEx.getMethod("getSQLState").invoke(root);
                map.put("sqlState", sqlState);
                map.put("dbMessage", safe(root.getMessage()));
            }
        } catch (Exception ignore) {}

        // Hibernate JDBCException
        try {
            Class<?> jdbcEx = Class.forName("org.hibernate.exception.JDBCException");
            if (jdbcEx.isInstance(ex)) {
                var sql = (String) jdbcEx.getMethod("getSQL").invoke(ex);
                map.put("sql", sql);
            }
        } catch (Exception ignore) {}

        // Spring JDBC exceptions with getSql()
        try {
            Class<?> badSql = Class.forName("org.springframework.jdbc.BadSqlGrammarException");
            if (badSql.isInstance(ex)) {
                var sql = (String) badSql.getMethod("getSql").invoke(ex);
                map.put("sql", sql);
            }
        } catch (Exception ignore) {}
        try {
            Class<?> unc = Class.forName("org.springframework.jdbc.UncategorizedSQLException");
            if (unc.isInstance(ex)) {
                var sql = (String) unc.getMethod("getSql").invoke(ex);
                map.put("sql", sql);
            }
        } catch (Exception ignore) {}

        map.putIfAbsent("rootMessage", safe(root.getMessage()));
        return map;
    }

    /* 400/500: errores de SQL tipado/gramática (parámetros, casts, etc.) */
    @ExceptionHandler({
        org.springframework.jdbc.BadSqlGrammarException.class,
        org.springframework.jdbc.UncategorizedSQLException.class
    })
    public ResponseEntity<ApiError> handleJdbcGrammar(Exception ex, HttpServletRequest req) {
        var details = dbDetails(ex);
        var sqlState = String.valueOf(details.getOrDefault("sqlState", ""));
        // Si es 42P.. (errores de sintaxis/parametrización en Postgres), respondemos 400
        boolean clientFault = sqlState.startsWith("42");
        var status = clientFault ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
        var msg = clientFault ? "Consulta SQL inválida o parámetros mal tipados" : "Error de base de datos";
        log.error("[SQL] {} on {} -> {} | details={}", status.value(), req.getRequestURI(), msg, details, ex);
        return ResponseEntity.status(status).body(new ApiError(status, msg, req.getRequestURI(), details));
    }

    /* 500: errores JPA/Hibernate genéricos */
    @ExceptionHandler({
        jakarta.persistence.PersistenceException.class,
        org.springframework.orm.jpa.JpaSystemException.class
    })
    public ResponseEntity<ApiError> handleJpa(Exception ex, HttpServletRequest req) {
        var details = dbDetails(ex); // deja el método como lo tienes (usa reflection)
        log.error("[JPA] 500 on {} | details={}", req.getRequestURI(), details, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Error de persistencia", req.getRequestURI(), details));
    }

    /* 500 (o 409/400 según convenga): cualquier DataAccessException no mapeada arriba */
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    public ResponseEntity<ApiError> handleDataAccess(org.springframework.dao.DataAccessException ex, HttpServletRequest req) {
        var details = dbDetails(ex);
        log.error("[DAO] 500 on {} | details={}", req.getRequestURI(), details, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Error de acceso a datos", req.getRequestURI(), details));
    }

    /* ================== Auth / permisos ================== */

    /* 401: credenciales inválidas (lanzadas en controlador/servicio) */
    @ExceptionHandler({ BadCredentialsException.class, UsernameNotFoundException.class, AuthenticationException.class })
    public ResponseEntity<ApiError> handleCredenciales(Exception ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.UNAUTHORIZED, "Usuario o contraseña inválidos", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.LOCKED, "Usuario deshabilitado", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.LOCKED).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.FORBIDDEN, "Acceso denegado", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /* ================== Validaciones y parámetros ================== */

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> errs = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errs.put(fe.getField(), fe.getDefaultMessage());
        }
        var body = new ApiError(HttpStatus.BAD_REQUEST, "Validación fallida", req.getRequestURI(), errs);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        var msg = "Parámetro inválido: " + ex.getName();
        var body = new ApiError(
            HttpStatus.BAD_REQUEST,
            msg,
            req.getRequestURI(),
            Map.of(
                "param", ex.getName(),
                "value", String.valueOf(ex.getValue()),
                "requiredType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "desconocido"
            )
        );
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArg(IllegalArgumentException ex, HttpServletRequest req) {
        var body = new ApiError(HttpStatus.BAD_REQUEST, ex.getMessage(), req.getRequestURI(), null);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleJakartaConstraint(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, Object> errs = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(cv -> errs.put(cv.getPropertyPath().toString(), cv.getMessage()));
        var body = new ApiError(HttpStatus.BAD_REQUEST, "Violación de restricciones", req.getRequestURI(), errs);
        return ResponseEntity.badRequest().body(body);
    }

    /* ================== Integridad de datos (FK / UNIQUE / NOT NULL) ================== */

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        // Info técnica (SQLState, constraint, etc.)
        var info = extractSqlInfo(ex);
        String sqlState = info.sqlState;
        Integer vendorCode = info.vendorCode;
        String constraintName = info.constraintName;
        String raw = info.rawMessage;

        // Mensajes del servicio (si ya dio uno humano)
        String custom = ex.getMessage() != null ? ex.getMessage() : "";
        String low = ((raw != null ? raw : "") + " " + custom).toLowerCase(Locale.ROOT);

        // Postgres
        boolean isPgForeignKey = "23503".equals(sqlState);
        boolean isPgUnique = "23505".equals(sqlState);
        boolean isPgNotNull = "23502".equals(sqlState);

        // MySQL
        boolean isMyForeignKey = vendorCode != null && (vendorCode == 1451 || vendorCode == 1452);
        boolean isMyUnique = vendorCode != null && vendorCode == 1062;
        boolean isMyNotNull = vendorCode != null && vendorCode == 1048;

        // Heurísticas por mensaje
        boolean msgForeign = low.contains("violates foreign key constraint") || low.contains("a foreign key constraint fails");
        boolean msgUnique = low.contains("duplicate key") || low.contains("duplicate entry");
        boolean msgNotNull = low.contains("null value in column") || low.contains("cannot be null");

        Map<String, Object> extra = new LinkedHashMap<>();
        if (constraintName != null) extra.put("constraint", constraintName);

        // ✅ Prioridad: si el servicio ya dio un mensaje humano claro, úsalo tal cual
        if (custom.toLowerCase(Locale.ROOT).contains("no se puede eliminar el cliente")) {
            var body = new ApiError(HttpStatus.CONFLICT, custom, req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }
        if (custom.toLowerCase(Locale.ROOT).contains("no se puede eliminar el proveedor")) {
            var body = new ApiError(HttpStatus.CONFLICT, custom, req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        // FK → 409 con mensaje genérico o específico
        if (isPgForeignKey || isMyForeignKey || msgForeign) {
            String friendly = "No se puede completar la operación porque el registro está en uso por otros recursos.";
            if (constraintName != null) {
                String c = constraintName.toLowerCase(Locale.ROOT);
                if (c.contains("present") && c.contains("unidad")) {
                    friendly = "No se puede eliminar la unidad porque está en uso por presentaciones.";
                }
            } else if (low.contains("present") && low.contains("unidad")) {
                friendly = "No se puede eliminar la unidad porque está en uso por presentaciones.";
            }
            var body = new ApiError(HttpStatus.CONFLICT, friendly, req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        // UNIQUE → 409
        if (isPgUnique || isMyUnique || msgUnique) {
            String friendly = "Registro duplicado.";
            if (constraintName != null) {
                String c = constraintName.toLowerCase(Locale.ROOT);
                if (c.contains("uk_unidad_simbolo") || (c.contains("uniq") && c.contains("simbolo"))) {
                    friendly = "Ya existe una unidad con ese símbolo.";
                } else if (c.contains("uk_unidad_nombre") || (c.contains("uniq") && c.contains("nombre"))) {
                    friendly = "Ya existe una unidad con ese nombre.";
                }
            } else if (low.contains("simbolo")) {
                friendly = "Ya existe una unidad con ese símbolo.";
            }
            var body = new ApiError(HttpStatus.CONFLICT, friendly, req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        // NOT NULL → 400
        if (isPgNotNull || isMyNotNull || msgNotNull) {
            var body = new ApiError(HttpStatus.BAD_REQUEST, "Campo requerido ausente.", req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.badRequest().body(body);
        }

        // Genérico
        var body = new ApiError(HttpStatus.BAD_REQUEST, "Violación de integridad de datos", req.getRequestURI(), extra.isEmpty() ? null : extra);
        return ResponseEntity.badRequest().body(body);
    }

    // (si Hibernate deja pasar su ConstraintViolationException sin envolver)
    @ExceptionHandler(org.hibernate.exception.ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleHibernateConstraint(org.hibernate.exception.ConstraintViolationException ex, HttpServletRequest req) {
        String constraintName = ex.getConstraintName();
        String sqlState = null;
        Integer vendorCode = null;
        if (ex.getCause() instanceof SQLException sql) {
            sqlState = sql.getSQLState();
            vendorCode = sql.getErrorCode();
        }
        Map<String, Object> extra = new LinkedHashMap<>();
        if (constraintName != null) extra.put("constraint", constraintName);

        boolean isPgForeignKey = "23503".equals(sqlState);
        boolean isPgUnique = "23505".equals(sqlState);

        if (isPgForeignKey) {
            String msg = "No se puede completar la operación porque el registro está en uso por otros recursos.";
            if (constraintName != null) {
                String c = constraintName.toLowerCase(Locale.ROOT);
                if (c.contains("present") && c.contains("unidad")) {
                    msg = "No se puede eliminar la unidad porque está en uso por presentaciones.";
                }
            }
            var body = new ApiError(HttpStatus.CONFLICT, msg, req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }
        if (isPgUnique) {
            var body = new ApiError(HttpStatus.CONFLICT, "Registro duplicado.", req.getRequestURI(), extra.isEmpty() ? null : extra);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        var body = new ApiError(HttpStatus.BAD_REQUEST, "Violación de restricción de base de datos", req.getRequestURI(), extra.isEmpty() ? null : extra);
        return ResponseEntity.badRequest().body(body);
    }

    /* ================== 500 genérico ================== */

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAll(Exception ex, HttpServletRequest req) {
        log.error("[GENERIC] 500 on {}", req.getRequestURI(), ex);
        var body = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", req.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    /* ================== Helpers ================== */

    private static class SqlInfo {
        final String sqlState;
        final Integer vendorCode;
        final String constraintName;
        final String rawMessage;

        SqlInfo(String sqlState, Integer vendorCode, String constraintName, String rawMessage) {
            this.sqlState = sqlState;
            this.vendorCode = vendorCode;
            this.constraintName = constraintName;
            this.rawMessage = rawMessage;
        }
    }

    private SqlInfo extractSqlInfo(Throwable ex) {
        String sqlState = null;
        Integer vendor = null;
        String constraint = null;
        String raw = ex.getMessage();

        if (ex instanceof org.hibernate.exception.ConstraintViolationException hce) {
            constraint = hce.getConstraintName();
            if (hce.getCause() instanceof SQLException sql) {
                sqlState = sql.getSQLState();
                vendor = sql.getErrorCode();
                raw = sql.getMessage();
            }
        }

        // Recorremos causes para encontrar SQLException si no la teníamos
        Throwable cur = ex;
        while (cur != null) {
            if (cur instanceof SQLException sql) {
                if (sqlState == null) sqlState = sql.getSQLState();
                if (vendor == null) vendor = sql.getErrorCode();
                if (raw == null || raw.isBlank()) raw = sql.getMessage();
            }
            cur = cur.getCause();
        }

        return new SqlInfo(sqlState, vendor, constraint, raw);
    }
}
