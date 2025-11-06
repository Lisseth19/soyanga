-- Tabla de tokens de restablecimiento de contraseña
CREATE TABLE IF NOT EXISTS password_reset_token (
                                                    id BIGSERIAL PRIMARY KEY,
                                                    user_id BIGINT NOT NULL,
                                                    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    solicitado_por_user_id BIGINT NULL
    );

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_token (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_token (expires_at);

-- FK opcional (si tu tabla usuarios es 'usuarios' con PK 'id_usuario')
ALTER TABLE password_reset_token
    ADD CONSTRAINT fk_prt_usuario
        FOREIGN KEY (user_id) REFERENCES usuarios (id_usuario)
            ON DELETE CASCADE;
