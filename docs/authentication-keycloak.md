# Autenticación con formulario propio y Keycloak

## Estado

Implementado para ejecución local y preparado en Terraform para AWS. El portal
presenta su propio formulario; el navegador no se redirige a Keycloak y no
almacena tokens en `localStorage`, `sessionStorage` ni JavaScript.

## Flujo

```text
Angular /login
  │ POST /v1/auth/login {username,password}
  v
Auth facade Lambda/Python ── Direct Grant confidencial ──> Keycloak
  │
  ├─ academic_access  HttpOnly; SameSite=Strict; Path=/v1
  ├─ academic_refresh HttpOnly; SameSite=Strict; Path=/v1/auth
  └─ academic_csrf    SameSite=Strict; Path=/ (legible por rutas Angular)
  v
Rutas /v1/* ── authorizer valida firma, issuer, audience, expiración y rol
```

En AWS, Angular y `/v1/*` comparten el hostname HTTPS de CloudFront. CloudFront
envía `/v1/*` a API Gateway sin caché y conserva cookies, consultas y los
encabezados necesarios. En local, Nginx hace el mismo proxy a `api:8080`.

## Endpoints de sesión

| Método y ruta | Protección | Propósito |
|---|---|---|
| `POST /v1/auth/login` | Pública + límite de tasa | Intercambia credenciales con Keycloak y crea cookies de sesión. |
| `GET /v1/auth/me` | Access token validado | Devuelve identidad, tenant y roles seguros. |
| `POST /v1/auth/refresh` | Refresh cookie + CSRF | Rota access token, refresh token y token CSRF. |
| `POST /v1/auth/logout` | CSRF si existe sesión | Cierra la sesión en Keycloak y elimina las tres cookies. |

El formulario acepta solamente usuario y contraseña. El backend reenvía esos
valores inmediatamente al endpoint de tokens y nunca los registra ni persiste.
Los errores de credenciales son genéricos para evitar enumeración de usuarios.
Alta de usuarios, cambio/recuperación de contraseña y MFA quedan fuera del
portal; los administra Keycloak.

## Clientes y roles

| Cliente | Tipo | Uso | Flujos habilitados |
|---|---|---|---|
| `academic-api` | Recurso | Audiencia y roles de la API | Ninguno |
| `academic-bff` | Confidencial | Fachada de login | Direct Access Grants únicamente |

No existe un cliente OAuth público en el frontend. El secreto de `academic-bff`
vive solamente en variables del backend; local usa un valor de demostración y
Terraform genera un valor aleatorio para AWS.

La autorización acepta exclusivamente
`resource_access.academic-api.roles`. No acepta roles del realm ni roles de
otro cliente. Los roles humanos son `STUDENT`, `REVIEWER`, `ANALYST` y
`ADMINISTRATOR`. El `tenant_id` proviene del token y se compara con el tenant
configurado.

## Controles implementados

- Cookies de sesión no persistentes; al cerrar el navegador finaliza su vida en
  el cliente. `Secure` es obligatorio en AWS y se desactiva solo para HTTP local.
- `HttpOnly` protege access y refresh tokens frente a lectura desde JavaScript.
- `SameSite=Strict`, origen único y token CSRF HMAC con patrón double-submit
  protegen operaciones `POST`, `PATCH`, `PUT` y `DELETE`.
- El refresh se rota automáticamente después de un `401`; una sola solicitud de
  refresh se comparte entre llamadas concurrentes del frontend.
- El authorizer no usa `Authorization` como fuente obligatoria, porque también
  admite la cookie. Sigue aceptando Bearer para pruebas y clientes de máquina.
- Caché del authorizer desactivada y matriz de rutas deny-by-default.
- Límite AWS para login: ráfaga 5, tasa sostenida 2 solicitudes/segundo.
- Respuestas de autenticación llevan `Cache-Control: no-store`.
- CloudFront agrega CSP, HSTS, `X-Frame-Options: DENY`, protección MIME y una
  política restrictiva de referrer a las respuestas del portal y la API.
- AWS WAF no se incluye en el demo efímero por la prioridad explícita de costo;
  un entorno duradero debe añadir reglas administradas y rate limiting por IP.

## Excepción de seguridad aceptada

El requisito de capturar la contraseña en el formulario propio sin redirección
obliga a usar Resource Owner Password Credentials, llamado Direct Access Grants
en Keycloak. OAuth 2.0 Security Best Current Practice establece que este grant
no debe usarse porque expone la credencial al cliente y no se adapta a MFA ni a
flujos modernos. La decisión se acepta únicamente para esta demostración
académica y queda registrada en [ADR-025](ADR-025-custom-login-keycloak-bff.md).

Una evolución productiva debe volver a Authorization Code + PKCE o usar un
flujo administrado por el proveedor de identidad, aunque eso implique una
redirección visible.

Referencias: [Keycloak OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers),
[RFC 9700, sección 2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.4),
[AWS HTTP API Lambda authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html).

## Prueba local

Para que el nuevo cliente se importe en una instalación que ya tiene volumen de
Keycloak, se requiere un único reinicio limpio del entorno local. Esto elimina
solo datos Docker locales y debe ejecutarse conscientemente:

```bash
docker compose down --volumes
docker compose up -d --build
```

Después se ingresa en <http://localhost:4200> con cualquiera de estas cuentas:

| Usuario | Contraseña | Destino inicial |
|---|---|---|
| `estudiante.sistemas` | `estudiante` | Solicitudes |
| `revisor.sistemas` | `revisor` | Validación |
| `analista.sistemas` | `analista` | Reportes OLAP |
| `admin.sistemas` | `admin` | Reportes OLAP |

La URL debe permanecer en `localhost:4200`; abrir Keycloak solo es necesario
para administración de usuarios.
