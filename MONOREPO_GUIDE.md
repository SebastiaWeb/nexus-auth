# Guía del Monorepo `nexus-auth`

Este documento explica la estructura y las herramientas utilizadas en este monorepo para el proyecto `nexus-auth`.

## 1. ¿Qué es un Monorepo?

Un monorepo es una estrategia de desarrollo donde el código de múltiples paquetes o proyectos se almacena en un único repositorio de código. Esto facilita la gestión de dependencias, la compartición de código y la coherencia en todo el ecosistema de `nexus-auth`.

## 2. Herramientas Clave

### ¿Por qué Nx?

[Nx](https://nx.dev/) es una herramienta de construcción extensible para monorepos. La hemos elegido por varias razones clave:

- **Optimización de Builds:** Nx es inteligente a la hora de construir, probar y desplegar el código. Analiza el grafo de dependencias y solo ejecuta tareas sobre los paquetes que han cambiado, ahorrando tiempo de CI/CD.
- **Generadores de Código:** Permite crear nuevos paquetes, componentes o módulos de forma consistente mediante comandos, asegurando que se sigan las convenciones del proyecto.
- **Tree-Shaking y Paquetes Ligeros:** Ayuda a generar paquetes optimizados que solo incluyen el código necesario, lo cual es crucial para nuestro objetivo de crear una librería ligera.
- **Cacheo de Tareas:** Guarda el resultado de tareas como `build` o `test`. Si no hay cambios, reutiliza el resultado anterior, haciendo las operaciones casi instantáneas.

### ¿Por qué pnpm?

[pnpm](https://pnpm.io/) es un gestor de paquetes rápido y eficiente en el uso del espacio en disco. A diferencia de npm o yarn, pnpm utiliza un único "content-addressable store" para los módulos.

- **Ahorro de Espacio:** Las dependencias solo se guardan una vez en el disco y se enlazan simbólicamente (`symlinks`) a los `node_modules` de cada proyecto. En un monorepo con muchas dependencias compartidas, el ahorro es significativo.
- **Instalaciones Rápidas:** Gracias a su sistema de cacheo y enlaces, las instalaciones son mucho más rápidas.
- **Seguridad:** Su estructura de `node_modules` es menos permisiva por defecto, lo que ayuda a evitar que los paquetes accedan a dependencias que no han sido declaradas explícitamente.

## 3. Estructura de Directorios

La estructura principal que usaremos es:

```
nexus-auth/
├── packages/
│   ├── core/         # -> @nexusauth/core (lógica principal)
│   ├── typeorm-adapter/ # -> @nexusauth/typeorm-adapter
│   └── ...           # -> Otros adapters y providers
├── nx.json           # -> Configuración de Nx
├── package.json      # -> Dependencias del workspace
└── pnpm-workspace.yaml # -> Define el workspace para pnpm
```

- **`packages/`**: Este directorio contendrá todos los paquetes publicables del ecosistema `nexus-auth`. Cada subdirectorio será un paquete independiente con su propio `package.json`.

## 4. Estrategia de `peerDependencies`

Esta es una parte crucial de nuestra arquitectura para mantener los paquetes ligeros y flexibles.

Un `peerDependency` (dependencia de pares) es una dependencia que un paquete espera que esté disponible en el entorno del proyecto que lo consume, pero que no la incluye directamente.

**Ejemplo práctico:**

El paquete `@nexusauth/typeorm-adapter` necesita `typeorm` para funcionar, pero no lo empaquetará dentro de sí mismo. En su lugar, su `package.json` se verá así:

```json
{
  "name": "@nexusauth/typeorm-adapter",
  "version": "0.0.1",
  "peerDependencies": {
    "@nexusauth/core": "0.0.1",
    "typeorm": "^0.3.0"
  }
}
```

**¿Por qué es importante?**

1.  **El usuario tiene el control:** El desarrollador que use nuestra librería ya tendrá `typeorm` en su proyecto. Nuestro adapter usará esa versión existente en lugar de forzar una propia, evitando conflictos.
2.  **Paquetes pequeños:** Nuestro paquete `@nexusauth/typeorm-adapter` solo contendrá la lógica del adaptador, no la librería `typeorm` completa, haciéndolo muy ligero.

## 5. Comandos Comunes de Nx

Aquí hay algunos comandos que usaremos frecuentemente:

- **Crear un nuevo paquete:**
  ```bash
  nx g @nx/js:lib <nombre-paquete> --directory=packages
  ```

- **Construir todos los paquetes:**
  ```bash
  nx run-many --target=build
  ```

- **Construir un paquete específico:**
  ```bash
  nx build <nombre-paquete>
  ```

- **Ejecutar tests para todos los paquetes:**
  ```bash
  nx run-many --target=test
  ```

- **Ver el grafo de dependencias:**
  ```bash
  nx graph
  ```
