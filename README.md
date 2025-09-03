# SOYANGA — Monorepo (Backend + Frontend)

**Backend:** Java 17 · Spring Boot 3.5.x · Maven (wrapper) · PostgreSQL · Flyway  
**Frontend:** React + TypeScript + Vite · Tailwind CSS v4

- **API (dev):** [http://localhost:8084](http://localhost:8084)
- **Web (dev):** [http://localhost:5173](http://localhost:5173)

---

## Tabla de contenidos
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Configuración de entorno](#configuracion-de-entorno)
- [Cómo ejecutar en desarrollo](#como-ejecutar-en-desarrollo)
- [Comandos útiles](#comandos-utiles)
- [Migraciones (Flyway)](#migraciones-flyway)
- [CORS y Proxy de Vite](#cors-y-proxy-de-vite)
- [Convenciones por capas](#convenciones-por-capas)
- [Flujo de trabajo (git)](#flujo-de-trabajo-git)
- [Pruebas rápidas](#pruebas-rapidas)
- [Próximo módulo](#proximo-modulo)

---

## Estructura del proyecto

```text
soyanga/
├─ package.json             # monorepo: scripts para levantar back + front
├─ .gitignore
├─ README.md
├─ soyanga-backend/         # Spring Boot (Java)
│  ├─ pom.xml
│  └─ src/main/java/com/soyanga/soyangabackend/
│     ├─ configuracion/     # Seguridad (CORS), Swagger, Jackson, etc.
│     │  └─ SecurityConfig.java
│     ├─ web/               # Controladores REST (HTTP)
│     │  ├─ advice/         # Manejo global de errores (ControllerAdvice)
│     │  └─ ...Controladores.java
│     ├─ servicio/          # Lógica de negocio (@Service)
│     ├─ repositorio/       # Acceso a datos (JpaRepository, @Query)
│     ├─ dominio/           # Entidades JPA (tablas)
│     ├─ dto/               # Request/Response de la API
│     ├─ mapeo/             # (opcional) MapStruct: Entidad ↔ DTO
│     ├─ util/              # Utilidades puntuales
│     └─ src/main/resources/
│        ├─ application.properties      # Puerto, DB, JPA, Flyway, Swagger
│        └─ db/migration/
│           └─ V1__schema.sql           # DDL (sin BEGIN/COMMIT)
└─ frontend/                 # React + Vite + Tailwind
   ├─ package.json
   ├─ vite.config.ts
   ├─ postcss.config.js      # Tailwind v4: @tailwindcss/postcss
   └─ src/
      ├─ app/                # Estructura global
      │  ├─ AppLayout.tsx    # Marco (header/nav/footer) + <Outlet/>
      │  └─ rutas.tsx        # Rutas (React Router)
      ├─ paginas/            # Páginas (URLs)
      │  ├─ Inicio.tsx
      │  └─ Health.tsx       # /salud → consume /api/health
      ├─ componentes/
      │  └─ ui/              # UI reutilizable (Tarjeta, Botón, Tabla…)
      ├─ modulos/            # Por dominio (inventario, compras, ventas…)
      │  └─ inventario/
      │     ├─ paginas/
      │     ├─ componentes/
      │     ├─ api.ts
      │     └─ tipos.ts
      ├─ servicios/
      │  └─ api.ts           # Helper fetch global
      ├─ estilos/
      │  └─ index.css        # Tailwind v4: @import "tailwindcss";
      └─ assets/             # Imágenes, iconos, fuentes
```
---
## Requisitos

- **Java 17** (Temurin/Adoptium recomendado)
- **Node.js 20+** (recomendado **22.x**) y **npm**
- **PostgreSQL 14+**
- **Git**

### Verifica versiones

    java -version
    node -v
    npm -v
    psql --version
    git --version
---    
