

-- =========================================================
--  Módulo: Configuración y Catálogo
-- =========================================================

-- 1) Sucursales
CREATE TABLE sucursales (
                            id_sucursal           BIGSERIAL PRIMARY KEY,
                            nombre_sucursal       TEXT NOT NULL,
                            direccion             TEXT NOT NULL,
                            ciudad                TEXT NOT NULL,
                            estado_activo         BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2) Almacenes
CREATE TABLE almacenes (
                           id_almacen            BIGSERIAL PRIMARY KEY,
                           id_sucursal           BIGINT NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
                           nombre_almacen        TEXT NOT NULL,
                           descripcion           TEXT,
                           estado_activo         BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_almacenes_sucursal ON almacenes(id_sucursal);

-- 3) Monedas
CREATE TABLE monedas (
                         id_moneda             BIGSERIAL PRIMARY KEY,
                         codigo_moneda         TEXT NOT NULL UNIQUE,  -- BOB, USD, USDT
                         nombre_moneda         TEXT NOT NULL,
                         es_moneda_local       BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4) Tipos de cambio (histórico)
CREATE TABLE tipos_de_cambio (
                                 id_tipo_cambio        BIGSERIAL PRIMARY KEY,
                                 id_moneda_origen      BIGINT NOT NULL REFERENCES monedas(id_moneda) ON DELETE RESTRICT,
                                 id_moneda_destino     BIGINT NOT NULL REFERENCES monedas(id_moneda) ON DELETE RESTRICT,
                                 fecha_vigencia        DATE NOT NULL,
                                 tasa_cambio           NUMERIC(18,6) NOT NULL CHECK (tasa_cambio > 0)
);
CREATE INDEX idx_tc_monedas_fecha ON tipos_de_cambio(id_moneda_origen, id_moneda_destino, fecha_vigencia);

-- 5) Categorías de productos (jerárquica)
CREATE TABLE categorias_de_productos (
                                         id_categoria          BIGSERIAL PRIMARY KEY,
                                         nombre_categoria      TEXT NOT NULL,
                                         descripcion           TEXT,
                                         id_categoria_padre    BIGINT REFERENCES categorias_de_productos(id_categoria) ON DELETE SET NULL
);
CREATE INDEX idx_categorias_padre ON categorias_de_productos(id_categoria_padre);

-- 6) Productos (maestro)
CREATE TABLE productos (
                           id_producto           BIGSERIAL PRIMARY KEY,
                           nombre_producto       TEXT NOT NULL,
                           descripcion           TEXT,
                           id_categoria          BIGINT NOT NULL REFERENCES categorias_de_productos(id_categoria) ON DELETE RESTRICT,
                           principio_activo      TEXT,
                           registro_sanitario    TEXT,
                           estado_activo         BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_productos_categoria ON productos(id_categoria);
CREATE INDEX idx_productos_nombre ON productos USING GIN (to_tsvector('spanish', nombre_producto));

-- 7) Unidades de medida
CREATE TABLE unidades_de_medida (
                                    id_unidad             BIGSERIAL PRIMARY KEY,
                                    nombre_unidad         TEXT NOT NULL,
                                    simbolo_unidad        TEXT NOT NULL,
                                    factor_conversion_base NUMERIC(18,6) NOT NULL DEFAULT 1 CHECK (factor_conversion_base > 0)
);

-- 8) Presentaciones de productos (SKU)
CREATE TABLE presentaciones_de_productos (
                                             id_presentacion           BIGSERIAL PRIMARY KEY,
                                             id_producto               BIGINT NOT NULL REFERENCES productos(id_producto) ON DELETE RESTRICT,
                                             id_unidad                 BIGINT NOT NULL REFERENCES unidades_de_medida(id_unidad) ON DELETE RESTRICT,
                                             contenido_por_unidad      NUMERIC(18,6) NOT NULL CHECK (contenido_por_unidad > 0),
                                             codigo_sku                TEXT NOT NULL UNIQUE,
                                             costo_base_usd            NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (costo_base_usd >= 0),
                                             margen_venta_porcentaje   NUMERIC(9,4) NOT NULL DEFAULT 0 CHECK (margen_venta_porcentaje >= 0),
                                             precio_venta_bob          NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (precio_venta_bob >= 0),
                                             estado_activo             BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_presentaciones_producto ON presentaciones_de_productos(id_producto);

-- 9) Códigos de barras
CREATE TABLE codigos_de_barras (
                                   id_codigo_barras      BIGSERIAL PRIMARY KEY,
                                   id_presentacion       BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE CASCADE,
                                   codigo_barras         TEXT NOT NULL,
                                   descripcion           TEXT,
                                   UNIQUE (id_presentacion, codigo_barras)
);
CREATE INDEX idx_codigos_barras_codigo ON codigos_de_barras(codigo_barras);

-- =========================================================
--  Módulo: Proveedores y Compras (Pedidos y Recepciones)
-- =========================================================

-- 10) Proveedores
CREATE TABLE proveedores (
                             id_proveedor          BIGSERIAL PRIMARY KEY,
                             razon_social          TEXT NOT NULL,
                             nit                   TEXT,
                             contacto              TEXT,
                             telefono              TEXT,
                             correo_electronico    TEXT,
                             direccion             TEXT,
                             estado_activo         BOOLEAN NOT NULL DEFAULT TRUE
);

-- 11) Compras (cabecera del pedido al proveedor)
CREATE TABLE compras (
                         id_compra             BIGSERIAL PRIMARY KEY,
                         id_proveedor          BIGINT NOT NULL REFERENCES proveedores(id_proveedor) ON DELETE RESTRICT,
                         fecha_compra          TIMESTAMP NOT NULL,
                         id_moneda             BIGINT NOT NULL REFERENCES monedas(id_moneda) ON DELETE RESTRICT, -- usualmente USD
                         tipo_cambio_usado     NUMERIC(18,6) NOT NULL CHECK (tipo_cambio_usado > 0),
                         estado_compra         VARCHAR(20) NOT NULL CHECK (estado_compra IN ('pendiente','aprobada','enviada','parcial','recibida','anulada')),
                         observaciones         TEXT
);
CREATE INDEX idx_compras_proveedor_fecha ON compras(id_proveedor, fecha_compra);
CREATE INDEX idx_compras_estado ON compras(estado_compra);

-- 12) Compras detalle (líneas del pedido)
CREATE TABLE compras_detalle (
                                 id_compra_detalle         BIGSERIAL PRIMARY KEY,
                                 id_compra                 BIGINT NOT NULL REFERENCES compras(id_compra) ON DELETE CASCADE,
                                 id_presentacion           BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE RESTRICT,
                                 cantidad                  NUMERIC(18,3) NOT NULL CHECK (cantidad > 0),
                                 costo_unitario_moneda     NUMERIC(18,6) NOT NULL CHECK (costo_unitario_moneda >= 0),
                                 fecha_estimada_recepcion  DATE
);
CREATE INDEX idx_comp_det_compra ON compras_detalle(id_compra);
CREATE INDEX idx_comp_det_presentacion ON compras_detalle(id_presentacion);

-- 14) Recepciones de pedido (cabecera)
CREATE TABLE recepciones_de_pedido (
                                       id_recepcion             BIGSERIAL PRIMARY KEY,
                                       id_compra                BIGINT NOT NULL REFERENCES compras(id_compra) ON DELETE RESTRICT,
                                       fecha_recepcion          TIMESTAMP NOT NULL,
                                       id_almacen               BIGINT NOT NULL REFERENCES almacenes(id_almacen) ON DELETE RESTRICT,
                                       numero_documento_proveedor VARCHAR(80),
                                       estado_recepcion         VARCHAR(20) NOT NULL CHECK (estado_recepcion IN ('registrada','cerrada','anulada')),
                                       observaciones            TEXT
);
CREATE INDEX idx_recepciones_compra_fecha ON recepciones_de_pedido(id_compra, fecha_recepcion);
CREATE INDEX idx_recepciones_almacen ON recepciones_de_pedido(id_almacen);

-- 15) Recepciones detalle (lo físicamente recibido)
CREATE TABLE recepciones_detalle (
                                     id_recepcion_detalle     BIGSERIAL PRIMARY KEY,
                                     id_recepcion             BIGINT NOT NULL REFERENCES recepciones_de_pedido(id_recepcion) ON DELETE CASCADE,
                                     id_compra_detalle        BIGINT NOT NULL REFERENCES compras_detalle(id_compra_detalle) ON DELETE RESTRICT,
                                     id_presentacion          BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE RESTRICT,
                                     cantidad_recibida        NUMERIC(18,3) NOT NULL CHECK (cantidad_recibida > 0),
                                     costo_unitario_moneda    NUMERIC(18,6) NOT NULL CHECK (costo_unitario_moneda >= 0),
                                     observaciones            TEXT
);
CREATE INDEX idx_recep_det_recepcion ON recepciones_detalle(id_recepcion);
CREATE INDEX idx_recep_det_compra_detalle ON recepciones_detalle(id_compra_detalle);
CREATE INDEX idx_recep_det_presentacion ON recepciones_detalle(id_presentacion);

-- 13) Lotes (nacen en la recepción)
CREATE TABLE lotes (
                       id_lote                BIGSERIAL PRIMARY KEY,
                       id_recepcion_detalle   BIGINT NOT NULL REFERENCES recepciones_detalle(id_recepcion_detalle) ON DELETE RESTRICT,
                       id_presentacion        BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE RESTRICT,
                       numero_lote            TEXT NOT NULL,
                       fecha_fabricacion      DATE,
                       fecha_vencimiento      DATE NOT NULL,
                       observaciones          TEXT,
                       UNIQUE (id_recepcion_detalle, numero_lote)  -- evita duplicar el mismo número de lote en la misma recepción
);
CREATE INDEX idx_lotes_recepcion_detalle ON lotes(id_recepcion_detalle);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento);

-- =========================================================
--  Módulo: Inventario y Logística
-- =========================================================

-- 14) Existencias por lote y almacén
CREATE TABLE existencias_por_lote (
                                      id_existencia_lote     BIGSERIAL PRIMARY KEY,
                                      id_almacen             BIGINT NOT NULL REFERENCES almacenes(id_almacen) ON DELETE RESTRICT,
                                      id_lote                BIGINT NOT NULL REFERENCES lotes(id_lote) ON DELETE RESTRICT,
                                      cantidad_disponible    NUMERIC(18,3) NOT NULL DEFAULT 0,
                                      cantidad_reservada     NUMERIC(18,3) NOT NULL DEFAULT 0,
                                      stock_minimo           NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
                                      fecha_ultima_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
                                      UNIQUE (id_almacen, id_lote)
);
CREATE INDEX idx_existencias_almacen ON existencias_por_lote(id_almacen);
CREATE INDEX idx_existencias_lote ON existencias_por_lote(id_lote);

-- 15) Movimientos de inventario (kárdex)
CREATE TABLE movimientos_de_inventario (
                                           id_movimiento          BIGSERIAL PRIMARY KEY,
                                           fecha_movimiento       TIMESTAMP NOT NULL DEFAULT NOW(),
                                           tipo_movimiento        VARCHAR(30) NOT NULL CHECK (tipo_movimiento IN ('ingreso_compra','salida_venta','reserva_anticipo','liberacion_reserva','transferencia_salida','transferencia_ingreso','ajuste')),
                                           id_almacen_origen      BIGINT REFERENCES almacenes(id_almacen) ON DELETE SET NULL,
                                           id_almacen_destino     BIGINT REFERENCES almacenes(id_almacen) ON DELETE SET NULL,
                                           id_lote                BIGINT REFERENCES lotes(id_lote) ON DELETE SET NULL,
                                           cantidad               NUMERIC(18,3) NOT NULL,
                                           referencia_modulo      VARCHAR(30) NOT NULL, -- 'venta','compra','transferencia','anticipo','ajuste','recepcion'
                                           id_referencia          BIGINT NOT NULL,
                                           observaciones          TEXT
);
CREATE INDEX idx_movimientos_fecha ON movimientos_de_inventario(fecha_movimiento);
CREATE INDEX idx_movimientos_lote ON movimientos_de_inventario(id_lote);
CREATE INDEX idx_movimientos_referencia ON movimientos_de_inventario(referencia_modulo, id_referencia);

-- 16) Transferencias entre almacenes (cabecera)
CREATE TABLE transferencias_entre_almacenes (
                                                id_transferencia       BIGSERIAL PRIMARY KEY,
                                                fecha_transferencia    TIMESTAMP NOT NULL,
                                                id_almacen_origen      BIGINT NOT NULL REFERENCES almacenes(id_almacen) ON DELETE RESTRICT,
                                                id_almacen_destino     BIGINT NOT NULL REFERENCES almacenes(id_almacen) ON DELETE RESTRICT,
                                                estado_transferencia   VARCHAR(20) NOT NULL CHECK (estado_transferencia IN ('pendiente','en_transito','completada','anulada')),
                                                observaciones          TEXT
);
CREATE INDEX idx_transferencias_origen_destino ON transferencias_entre_almacenes(id_almacen_origen, id_almacen_destino);

-- 17) Transferencias detalle (por lote)
CREATE TABLE transferencias_detalle (
                                        id_transferencia_detalle  BIGSERIAL PRIMARY KEY,
                                        id_transferencia          BIGINT NOT NULL REFERENCES transferencias_entre_almacenes(id_transferencia) ON DELETE CASCADE,
                                        id_lote                   BIGINT NOT NULL REFERENCES lotes(id_lote) ON DELETE RESTRICT,
                                        cantidad                  NUMERIC(18,3) NOT NULL CHECK (cantidad > 0)
);
CREATE INDEX idx_trans_det_transferencia ON transferencias_detalle(id_transferencia);
CREATE INDEX idx_trans_det_lote ON transferencias_detalle(id_lote);

-- =========================================================
--  Módulo: Clientes, Ventas y Facturación/Boletas
-- =========================================================

-- 18) Clientes
CREATE TABLE clientes (
                          id_cliente             BIGSERIAL PRIMARY KEY,
                          razon_social_o_nombre  TEXT NOT NULL,
                          nit                    TEXT,
                          telefono               TEXT,
                          correo_electronico     TEXT,
                          direccion              TEXT,
                          ciudad                 TEXT,
                          condicion_de_pago      VARCHAR(20) NOT NULL CHECK (condicion_de_pago IN ('contado','credito')),
                          limite_credito_bob     NUMERIC(18,2),
                          estado_activo          BOOLEAN NOT NULL DEFAULT TRUE
);

-- 19) Ventas (cabecera)
CREATE TABLE ventas (
                        id_venta               BIGSERIAL PRIMARY KEY,
                        fecha_venta            TIMESTAMP NOT NULL,
                        id_cliente             BIGINT REFERENCES clientes(id_cliente) ON DELETE SET NULL,
                        tipo_documento_tributario VARCHAR(20) NOT NULL CHECK (tipo_documento_tributario IN ('boleta','factura')),
                        numero_documento       TEXT,
                        id_moneda              BIGINT NOT NULL REFERENCES monedas(id_moneda) ON DELETE RESTRICT, -- BOB
                        total_bruto_bob        NUMERIC(18,2) NOT NULL DEFAULT 0,
                        descuento_total_bob    NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (descuento_total_bob >= 0),
                        total_neto_bob         NUMERIC(18,2) NOT NULL DEFAULT 0,
                        metodo_de_pago         VARCHAR(20) NOT NULL CHECK (metodo_de_pago IN ('efectivo','transferencia','mixto')),
                        condicion_de_pago      VARCHAR(20) NOT NULL CHECK (condicion_de_pago IN ('contado','credito')),
                        fecha_vencimiento_credito DATE,
                        id_almacen_despacho    BIGINT NOT NULL REFERENCES almacenes(id_almacen) ON DELETE RESTRICT,
                        estado_venta           VARCHAR(20) NOT NULL CHECK (estado_venta IN ('borrador','confirmada','despachada','anulada')),
                        observaciones          TEXT
);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX idx_ventas_cliente ON ventas(id_cliente);

-- 20) Ventas detalle
CREATE TABLE ventas_detalle (
                                id_venta_detalle       BIGSERIAL PRIMARY KEY,
                                id_venta               BIGINT NOT NULL REFERENCES ventas(id_venta) ON DELETE CASCADE,
                                id_presentacion        BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE RESTRICT,
                                cantidad               NUMERIC(18,3) NOT NULL CHECK (cantidad > 0),
                                precio_unitario_bob    NUMERIC(18,6) NOT NULL CHECK (precio_unitario_bob >= 0),
                                descuento_porcentaje   NUMERIC(9,4) NOT NULL DEFAULT 0 CHECK (descuento_porcentaje >= 0),
                                descuento_monto_bob    NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (descuento_monto_bob >= 0),
                                subtotal_bob           NUMERIC(18,6) NOT NULL DEFAULT 0
);
CREATE INDEX idx_venta_det_venta ON ventas_detalle(id_venta);
CREATE INDEX idx_venta_det_presentacion ON ventas_detalle(id_presentacion);

-- 21) Ventas detalle por lotes (trazabilidad)
CREATE TABLE ventas_detalle_lotes (
                                      id_venta_detalle_lote  BIGSERIAL PRIMARY KEY,
                                      id_venta_detalle       BIGINT NOT NULL REFERENCES ventas_detalle(id_venta_detalle) ON DELETE CASCADE,
                                      id_lote                BIGINT NOT NULL REFERENCES lotes(id_lote) ON DELETE RESTRICT,
                                      cantidad               NUMERIC(18,3) NOT NULL CHECK (cantidad > 0)
);
CREATE INDEX idx_venta_det_lotes_detalle ON ventas_detalle_lotes(id_venta_detalle);
CREATE INDEX idx_venta_det_lotes_lote ON ventas_detalle_lotes(id_lote);

-- 22) Anticipos (cabecera)
CREATE TABLE anticipos (
                           id_anticipo            BIGSERIAL PRIMARY KEY,
                           fecha_anticipo         TIMESTAMP NOT NULL,
                           id_cliente             BIGINT NOT NULL REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
                           monto_bob              NUMERIC(18,2) NOT NULL CHECK (monto_bob > 0),
                           estado_anticipo        VARCHAR(30) NOT NULL CHECK (estado_anticipo IN ('registrado','parcialmente_aplicado','aplicado_total','anulado')),
                           observaciones          TEXT
);
CREATE INDEX idx_anticipos_cliente_fecha ON anticipos(id_cliente, fecha_anticipo);

-- 23) Anticipos detalle (reserva por presentación)
CREATE TABLE anticipos_detalle (
                                   id_anticipo_detalle    BIGSERIAL PRIMARY KEY,
                                   id_anticipo            BIGINT NOT NULL REFERENCES anticipos(id_anticipo) ON DELETE CASCADE,
                                   id_presentacion        BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE RESTRICT,
                                   cantidad_reservada     NUMERIC(18,3) NOT NULL CHECK (cantidad_reservada > 0)
);
CREATE INDEX idx_anticipo_det_anticipo ON anticipos_detalle(id_anticipo);

-- 24) Aplicaciones de anticipo (a ventas)
CREATE TABLE aplicaciones_de_anticipo (
                                          id_aplicacion_anticipo BIGSERIAL PRIMARY KEY,
                                          id_anticipo            BIGINT NOT NULL REFERENCES anticipos(id_anticipo) ON DELETE CASCADE,
                                          id_venta               BIGINT NOT NULL REFERENCES ventas(id_venta) ON DELETE RESTRICT,
                                          monto_aplicado_bob     NUMERIC(18,2) NOT NULL CHECK (monto_aplicado_bob > 0),
                                          fecha_aplicacion       TIMESTAMP NOT NULL
);
CREATE INDEX idx_apl_anticipo_anticipo ON aplicaciones_de_anticipo(id_anticipo);
CREATE INDEX idx_apl_anticipo_venta ON aplicaciones_de_anticipo(id_venta);

-- 25) Cuentas por cobrar (1-1 con venta a crédito)
CREATE TABLE cuentas_por_cobrar (
                                    id_cuenta_cobrar       BIGSERIAL PRIMARY KEY,
                                    id_venta               BIGINT NOT NULL UNIQUE REFERENCES ventas(id_venta) ON DELETE CASCADE,
                                    monto_pendiente_bob    NUMERIC(18,2) NOT NULL CHECK (monto_pendiente_bob >= 0),
                                    fecha_emision          DATE NOT NULL,
                                    fecha_vencimiento      DATE NOT NULL,
                                    estado_cuenta          VARCHAR(20) NOT NULL CHECK (estado_cuenta IN ('pendiente','parcial','pagado','vencido'))
);
CREATE INDEX idx_cxc_vencimiento ON cuentas_por_cobrar(fecha_vencimiento);

-- 26) Pagos recibidos (cabecera)
CREATE TABLE pagos_recibidos (
                                 id_pago_recibido       BIGSERIAL PRIMARY KEY,
                                 fecha_pago             TIMESTAMP NOT NULL,
                                 id_cliente             BIGINT REFERENCES clientes(id_cliente) ON DELETE SET NULL,
                                 id_moneda              BIGINT NOT NULL REFERENCES monedas(id_moneda) ON DELETE RESTRICT,
                                 monto_moneda           NUMERIC(18,6) NOT NULL CHECK (monto_moneda > 0),
                                 monto_bob_equivalente  NUMERIC(18,6) NOT NULL CHECK (monto_bob_equivalente > 0),
                                 metodo_de_pago         VARCHAR(20) NOT NULL CHECK (metodo_de_pago IN ('efectivo','transferencia')),
                                 referencia_externa     TEXT,
                                 aplica_a_cuenta        BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_pagos_cliente_fecha ON pagos_recibidos(id_cliente, fecha_pago);

-- 26.1) Aplicaciones de pago (detalle)
CREATE TABLE aplicaciones_de_pago (
                                      id_aplicacion_pago     BIGSERIAL PRIMARY KEY,
                                      id_pago_recibido       BIGINT NOT NULL REFERENCES pagos_recibidos(id_pago_recibido) ON DELETE CASCADE,
                                      id_cuenta_cobrar       BIGINT NOT NULL REFERENCES cuentas_por_cobrar(id_cuenta_cobrar) ON DELETE RESTRICT,
                                      monto_aplicado_bob     NUMERIC(18,2) NOT NULL CHECK (monto_aplicado_bob > 0)
);
CREATE INDEX idx_apl_pago_pago ON aplicaciones_de_pago(id_pago_recibido);
CREATE INDEX idx_apl_pago_cxc ON aplicaciones_de_pago(id_cuenta_cobrar);

-- =========================================================
--  Módulo: Usuarios y Permisos
-- =========================================================

-- 27) Usuarios
CREATE TABLE usuarios (
                          id_usuario             BIGSERIAL PRIMARY KEY,
                          nombre_completo        TEXT NOT NULL,
                          correo_electronico     TEXT NOT NULL UNIQUE,
                          telefono               TEXT,
                          nombre_usuario         TEXT NOT NULL UNIQUE,
                          contrasena_hash        TEXT NOT NULL,
                          estado_activo          BOOLEAN NOT NULL DEFAULT TRUE
);

-- 28) Roles
CREATE TABLE roles (
                       id_rol                 BIGSERIAL PRIMARY KEY,
                       nombre_rol             TEXT NOT NULL UNIQUE,
                       descripcion            TEXT
);

-- 29) Permisos
CREATE TABLE permisos (
                          id_permiso             BIGSERIAL PRIMARY KEY,
                          nombre_permiso         TEXT NOT NULL UNIQUE,
                          descripcion            TEXT
);

-- 30) Usuarios-Roles (N-N)
CREATE TABLE usuarios_roles (
                                id_usuario_rol         BIGSERIAL PRIMARY KEY,
                                id_usuario             BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
                                id_rol                 BIGINT NOT NULL REFERENCES roles(id_rol) ON DELETE CASCADE,
                                UNIQUE (id_usuario, id_rol)
);
CREATE INDEX idx_usuarios_roles_usuario ON usuarios_roles(id_usuario);
CREATE INDEX idx_usuarios_roles_rol ON usuarios_roles(id_rol);

-- 31) Roles-Permisos (N-N)
CREATE TABLE roles_permisos (
                                id_rol_permiso         BIGSERIAL PRIMARY KEY,
                                id_rol                 BIGINT NOT NULL REFERENCES roles(id_rol) ON DELETE CASCADE,
                                id_permiso             BIGINT NOT NULL REFERENCES permisos(id_permiso) ON DELETE CASCADE,
                                UNIQUE (id_rol, id_permiso)
);
CREATE INDEX idx_roles_permisos_rol ON roles_permisos(id_rol);
CREATE INDEX idx_roles_permisos_permiso ON roles_permisos(id_permiso);

-- 32) Auditorías
CREATE TABLE auditorias (
                            id_auditoria           BIGSERIAL PRIMARY KEY,
                            fecha_evento           TIMESTAMP NOT NULL DEFAULT NOW(),
                            id_usuario             BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
                            modulo_afectado        TEXT NOT NULL,
                            accion                 TEXT NOT NULL,  -- crear, editar, eliminar, anular, login, etc.
                            id_registro_afectado   BIGINT,
                            detalle                TEXT
);
CREATE INDEX idx_auditorias_fecha ON auditorias(fecha_evento);
CREATE INDEX idx_auditorias_usuario ON auditorias(id_usuario);

-- =========================================================
--  Módulo: Reglas de precios e impuestos
-- =========================================================

-- 33) Impuestos (opcional)
CREATE TABLE impuestos (
                           id_impuesto            BIGSERIAL PRIMARY KEY,
                           nombre_impuesto        TEXT NOT NULL,
                           porcentaje             NUMERIC(9,4) NOT NULL CHECK (porcentaje >= 0),
                           estado_activo          BOOLEAN NOT NULL DEFAULT TRUE
);

-- 34) Precios de venta históricos
CREATE TABLE precios_de_venta_historicos (
                                             id_precio_historico    BIGSERIAL PRIMARY KEY,
                                             id_presentacion        BIGINT NOT NULL REFERENCES presentaciones_de_productos(id_presentacion) ON DELETE CASCADE,
                                             precio_venta_bob       NUMERIC(18,6) NOT NULL CHECK (precio_venta_bob >= 0),
                                             fecha_inicio_vigencia  TIMESTAMP NOT NULL,
                                             fecha_fin_vigencia     TIMESTAMP,
                                             motivo_cambio          TEXT
);
CREATE INDEX idx_precios_hist_presentacion ON precios_de_venta_historicos(id_presentacion, fecha_inicio_vigencia);


