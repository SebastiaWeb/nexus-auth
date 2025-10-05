# Arquitectura de `nexus-auth`

Este documento detalla la arquitectura de alto nivel de `nexus-auth`, que se basa en los principios de la **Arquitectura Hexagonal** (también conocida como Puertos y Adaptadores).

## Visión General

El objetivo es tener un núcleo de autenticación (`core`) que sea completamente independiente de cualquier tecnología externa, como bases de datos, ORMs o frameworks. Esto nos da la máxima flexibilidad y permite que la comunidad pueda extender `nexus-auth` fácilmente.

```
+----------------------------------------------------------------------------+
|                                                                            |
|  +-----------------+ +------------------+         +----------------+       |
|  |  Google Provider| |  GitHub Provider |         | TypeORM Adapter|       |
|  +-------+---------+ +--------+---------+         +--------+-------+       |
|          |                    |                          |                |
|          | (Implementa)       | (Implementa)             | (Implementa)   |
|          |                    |                          |                |
|  +-------V--------------------V--+      +----------------V--------------+ |
|  | PUERTO: `OAuthProvider`       |      | PUERTO: `BaseAdapter`         | |
|  +-------------------------------+      +-------------------------------+ |
|  |                                                                     | |
|  |                         @nexusauth/core                            | |
|  |                                                                     | |
|  |     (Lógica de negocio de autenticación: sesiones, JWTs, OAuth)     | |
|  |                                                                     | |
|  +---------------------------------------------------------------------+ |
|                                                                            |
+----------------------------------------------------------------------------+
```

## Componentes Clave

### 1. El Núcleo: `@nexusauth/core`

-   **Responsabilidad:** Contiene toda la lógica de negocio agnóstica a la tecnología.
-   **Los Puertos (Interfaces):** Define los contratos (`BaseAdapter`, `OAuthProvider`) que los componentes externos deben implementar.
-   **Independencia:** No tiene dependencias de ningún ORM, base de datos o SDK externo.

### 2. Los Adaptadores de Datos: `@nexusauth/*-adapter`

-   **Responsabilidad:** Conectan el núcleo con una tecnología de base de datos específica, implementando la `interface BaseAdapter`.

### 3. Los Proveedores OAuth: `@nexusauth/*-provider`

-   **Responsabilidad:** Conectan el núcleo con un proveedor de OAuth específico, implementando la `interface OAuthProvider`.

### 4. Estrategia de Adaptador de Doble Propósito

Los adaptadores de datos pueden operar en dos modos:
-   **Modo Simple (`Adapter(dataSource)`):** Para proyectos nuevos, usando modelos de datos por defecto que provee el adaptador.
-   **Modo Avanzado (`Adapter(dataSource, config)`):** Para proyectos existentes, permitiendo al usuario mapear sus propios modelos y columnas de base de datos.

### 5. Sistema de Extensibilidad: Eventos y Callbacks

Para permitir a los usuarios inyectar su propia lógica, el núcleo expone un sistema dual en la configuración:
-   **`events`**: Funciones para ejecutar "efectos secundarios" (ej. logging, envío de emails) en respuesta a eventos del ciclo de vida. No modifican el flujo.
-   **`callbacks`**: Funciones para modificar datos por defecto (ej. añadir información a un JWT). Reciben datos y deben devolverlos modificados.

Este sistema actúa como otro "puerto" hacia el exterior, permitiendo que el núcleo llame a código definido por el usuario en momentos específicos de forma segura.

## El Rol Clave de `peerDependencies`

Esta estrategia se aplica a todos los adaptadores y proveedores para mantener el núcleo ligero y evitar conflictos de versiones, dejando que el usuario final controle sus dependencias.

## Flujo de Uso (OAuth)

1.  El usuario instala `@nexusauth/core` y los adaptadores/proveedores que necesita.
2.  En la configuración, pasa al núcleo una instancia del adaptador de datos y una lista de proveedores.
3.  El núcleo orquesta el flujo de autenticación, hablando con las interfaces (`OAuthProvider`, `BaseAdapter`) sin conocer los detalles de la implementación final.