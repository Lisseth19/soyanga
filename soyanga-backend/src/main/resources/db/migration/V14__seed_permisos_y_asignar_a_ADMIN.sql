-- Asegura UNIQUE por nombre_permiso
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_permisos_nombre' AND conrelid = 'permisos'::regclass
    ) THEN
ALTER TABLE permisos
    ADD CONSTRAINT uk_permisos_nombre UNIQUE (nombre_permiso);
END IF;
END$$;

-- ===== Listado completo de permisos (CRUD + especiales) =====
-- Ajusta o agrega los que necesites. estado_activo = true.
WITH nuevos(nombre, descripcion) AS (
    VALUES
        -- Inventario / Productos
        ('inventario:ver',                         'Ver módulos de inventario'),
        ('productos:ver',                          'Ver productos'),
        ('productos:crear',                        'Crear productos'),
        ('productos:actualizar',                   'Actualizar productos'),
        ('productos:eliminar',                     'Eliminar productos'),

        -- Categorías
        ('categorias:ver',                         'Ver categorías'),
        ('categorias:crear',                       'Crear categorías'),
        ('categorias:actualizar',                  'Actualizar categorías'),
        ('categorias:eliminar',                    'Eliminar categorías'),

        -- Presentaciones
        ('presentaciones:ver',                     'Ver presentaciones'),
        ('presentaciones:crear',                   'Crear presentaciones'),
        ('presentaciones:actualizar',              'Actualizar presentaciones'),
        ('presentaciones:eliminar',                'Eliminar presentaciones'),

        -- Unidades
        ('unidades:ver',                           'Ver unidades de medida'),
        ('unidades:crear',                         'Crear unidades'),
        ('unidades:actualizar',                    'Actualizar unidades'),
        ('unidades:eliminar',                      'Eliminar unidades'),

        -- Sucursales
        ('sucursales:ver',                         'Ver sucursales'),
        ('sucursales:crear',                       'Crear sucursales'),
        ('sucursales:actualizar',                  'Actualizar sucursales'),
        ('sucursales:eliminar',                    'Eliminar sucursales'),

        -- Almacenes
        ('almacenes:ver',                          'Ver almacenes'),
        ('almacenes:crear',                        'Crear almacenes'),
        ('almacenes:actualizar',                   'Actualizar almacenes'),
        ('almacenes:eliminar',                     'Eliminar almacenes'),

        -- Monedas
        ('monedas:ver',                            'Ver monedas'),
        ('monedas:crear',                          'Crear monedas'),
        ('monedas:actualizar',                     'Actualizar monedas'),
        ('monedas:eliminar',                       'Eliminar monedas'),
        ('monedas:cambiar-estado',                 'Activar/Desactivar moneda'),

        -- Clientes
        ('clientes:ver',                           'Ver clientes'),
        ('clientes:crear',                         'Crear clientes'),
        ('clientes:actualizar',                    'Actualizar clientes'),
        ('clientes:eliminar',                      'Eliminar clientes'),

        -- Proveedores
        ('proveedores:ver',                        'Ver proveedores'),
        ('proveedores:crear',                      'Crear proveedores'),
        ('proveedores:actualizar',                 'Actualizar proveedores'),
        ('proveedores:eliminar',                   'Eliminar proveedores'),

        -- Seguridad / Usuarios
        ('usuarios:ver',                           'Ver usuarios'),
        ('usuarios:crear',                         'Crear usuarios'),
        ('usuarios:actualizar',                    'Actualizar usuarios'),
        ('usuarios:eliminar',                      'Eliminar usuarios'),
        ('usuarios:cambiar-estado',                'Activar/Desactivar usuario'),
        ('usuarios:cambiar-password',              'Cambiar contraseña de usuario'),
        ('usuarios:asignar-roles',                 'Asignar/Quitar roles a usuario'),

        -- Seguridad / Roles
        ('roles:ver',                              'Ver roles'),
        ('roles:crear',                            'Crear roles'),
        ('roles:actualizar',                       'Actualizar roles'),
        ('roles:eliminar',                         'Eliminar roles'),
        ('roles:cambiar-estado',                   'Activar/Desactivar rol'),
        ('roles:asignar-permisos',                 'Asignar/Quitar permisos a rol'),

        -- Seguridad / Permisos (entidad Permiso)
        ('permisos:ver',                           'Ver permisos'),
        ('permisos:crear',                         'Crear permisos'),
        ('permisos:actualizar',                    'Actualizar permisos'),
        ('permisos:eliminar',                      'Eliminar permisos'),
        ('permisos:activar',                       'Activar permiso'),
        ('permisos:desactivar',                    'Desactivar permiso'),

        -- Otros
        ('inventario:por-lote:ver',                'Ver inventario por lote'),
        ('salud:ver',                              'Ver estado de la API')
)
INSERT INTO permisos (nombre_permiso, descripcion, estado_activo)
SELECT nombre, descripcion, TRUE
FROM nuevos
    ON CONFLICT (nombre_permiso)
DO UPDATE SET
    descripcion   = EXCLUDED.descripcion,
           estado_activo = TRUE;  -- re-activa si estaba inactivo

-- ===== Asegura que exista rol ADMIN y asígnale todo =====
-- Crea ADMIN si no existe (estado_activo = true)
INSERT INTO roles (nombre_rol, descripcion, estado_activo)
SELECT 'ADMIN', 'Rol administrador del sistema', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE UPPER(nombre_rol) = 'ADMIN');

-- Asegura UNIQUE en roles_permisos (id_rol, id_permiso) si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_roles_permisos'
          AND conrelid = 'roles_permisos'::regclass
    ) THEN
ALTER TABLE roles_permisos
    ADD CONSTRAINT uk_roles_permisos UNIQUE (id_rol, id_permiso);
END IF;
END$$;

-- Vincula TODOS los permisos al rol ADMIN (no duplica)
WITH admin AS (
    SELECT id_rol
    FROM roles
    WHERE UPPER(nombre_rol) = 'ADMIN'
),
     perms AS (
         SELECT id_permiso
         FROM permisos
     )
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT a.id_rol, p.id_permiso
FROM admin a CROSS JOIN perms p
    ON CONFLICT (id_rol, id_permiso) DO NOTHING;
