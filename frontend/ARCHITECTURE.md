# Guía de Estructura y Arquitectura del Proyecto (Angular)

Para mantener el código escalable, limpio y fácil de entender, definimos una clara separación de responsabilidades entre **Layouts**, **Pages** y **Components**. En Angular, aunque todo técnicamente es un componente (decorador `@Component`), a nivel arquitectónico y semántico cumplen roles muy distintos.

## Conceptos Clave

### 1. Components (Componentes Reusables / UI)
- **Qué son:** También conocidos como *Dumb Components* o *Presentational Components*. Son bloques de construcción pequeños y enfocados en la interfaz de usuario.
- **Propósito:** Ser altamente **reusables**. Se encargan únicamente de mostrar datos y capturar interacciones del usuario.
- **Reglas:**
  - Se comunican mediante `@Input()` (para recibir datos) y `@Output()` (para emitir eventos).
  - **No deben** inyectar servicios que hagan peticiones HTTP, ni conocer el estado global de la aplicación (salvo excepciones muy justificadas).
- **Nomenclatura:** `[nombre].component.ts` (ej. `custom-button.component.ts`, `user-card.component.ts`).
- **Ubicación:** `src/app/shared/components/` (si se usan en toda la app) o `src/app/[feature]/components/` (si solo se usan dentro de un módulo específico).

### 2. Pages (Páginas / Vistas)
- **Qué son:** También conocidos como *Smart Components* o *Container Components*. Representan una vista completa a la que el usuario accede a través de una URL.
- **Propósito:** Orquestar los componentes pequeños (Dumb Components), inyectar servicios, comunicarse con las APIs, manejar el estado y la lógica de negocio de esa vista en particular.
- **Reglas:**
  - Son los únicos componentes que deben estar vinculados directamente en el Router (rutas).
  - Evitar que tengan mucha lógica de HTML puro; deben delegar la interfaz a los *Components* pequeños.
- **Nomenclatura:** Aunque usan el decorador `@Component`, es recomendable agruparlos en carpetas `pages` o sufijar la clase como `LoginPage`, `HomePage` para denotar su rol.
- **Ubicación:** `src/app/pages/` o `src/app/[feature]/pages/`.

### 3. Layouts (Plantillas o Estructuras de Diseño)
- **Qué son:** Son contenedores de alto nivel que definen la estructura general de una o varias páginas.
- **Propósito:** Evitar duplicar elementos comunes como el Navbar, Sidebar o Footer en cada página.
- **Reglas:**
  - Siempre deben contener un `<router-outlet>` en su HTML para renderizar la página hija correspondiente.
- **Nomenclatura:** `[nombre]-layout.component.ts` (ej. `admin-layout.component.ts`, `auth-layout.component.ts`).
- **Ubicación:** `src/app/layouts/` o `src/app/core/layouts/`.

---

## Ejemplo Práctico de Estructura de Carpetas

En lugar de tener todo mezclado y usar nombres confusos como `login-component` para una página completa, la estructura recomendada es:

```text
src/app/
 ├── core/
 │    └── layouts/                  <-- Layouts globales
 │         ├── auth-layout/         <-- Layout para login/registro (ej: centrado, sin navbar)
 │         │    ├── auth-layout.component.ts
 │         │    └── auth-layout.component.html (contiene <router-outlet>)
 │         └── main-layout/         <-- Layout principal (ej: con Navbar y Sidebar)
 │
 ├── auth/                          <-- Feature: Autenticación
 │    ├── components/               <-- Componentes específicos (Dumb)
 │    │    └── login-form/          <-- Formulario encapsulado y reusable
 │    │
 │    └── pages/                    <-- Vistas enrutables (Smart)
 │         ├── login/               
 │         │    ├── login.page.ts   <-- ✅ Queda clarísimo que es una página
 │         │    └── login.page.html
 │         └── register/
 │
 └── shared/
      └── components/               <-- Componentes UI globales (Dumb)
           ├── custom-button/
           └── custom-input/
```

---

## Cómo se refleja en el Router

Cuando configuramos las rutas (`.routes.ts`), la lógica de Layouts y Pages brilla, ya que usamos el sistema de rutas anidadas (hijas) de Angular.

```typescript
// auth.routes.ts
import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '../core/layouts/auth-layout/auth-layout.component';
import { LoginPageComponent } from './pages/login/login.page';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent, // 1. El Layout envuelve a sus hijos
    children: [
      {
        path: 'login',
        component: LoginPageComponent // 2. La ruta específica carga la Page
      },
      {
        path: 'register',
        component: RegisterPageComponent
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  }
];
```

## Beneficios de esta arquitectura

1. **Claridad Inmediata:** Al ver un archivo, su ubicación (pages vs components) te dice exactamente qué rol cumple (Smart vs Dumb).
2. **Reusabilidad:** Los componentes UI (`components/`) quedan libres de lógica de negocio o servicios pesados, lo que permite usarlos en cualquier lado.
3. **Mantenibilidad:** Si quieres cambiar el `Navbar` de toda la app, solo modificas el `MainLayoutComponent` en lugar de ir página por página.
