# ADR-025: Login propio con fachada de autenticación Keycloak

Estado: Aceptada e implementada

Fecha: 2026-11-25

## Contexto

El requisito funcional exige que el usuario vea y use un formulario propio del
portal, sin ser redirigido a la interfaz de Keycloak. Keycloak debe conservar la
propiedad de usuarios, contraseñas, roles y sesiones. El frontend es una SPA
estática y el despliegue final usará HTTPS generado por CloudFront.

La solución anterior usaba Authorization Code + PKCE, redirigía a Keycloak y
guardaba el access token en `localStorage`. Aunque ese flujo era el recomendado
por OAuth, incumplía el requisito visual y operativo confirmado.

## Decisión

Crear una fachada backend confidencial (`academic-bff`) que implemente login,
consulta de sesión, refresh y logout. Angular envía usuario y contraseña una
sola vez a `POST /v1/auth/login`; el backend los intercambia inmediatamente con
Keycloak mediante Direct Access Grants y entrega tokens solo en cookies
`HttpOnly`. La contraseña no se almacena ni registra.

Se adopta un único origen tanto local como AWS:

- Nginx publica Angular y hace proxy de `/v1/*` al API local.
- CloudFront publica Angular y enruta `/v1/*` a API Gateway.

Las cookies son no persistentes, `SameSite=Strict` y `Secure` fuera de local.
Las operaciones mutables requieren además un token CSRF firmado. La renovación
es automática y la administración de usuarios continúa exclusivamente en
Keycloak. No se implementan registro, recuperación de contraseña ni MFA en el
portal.

## Excepción aceptada

Direct Access Grants equivale al grant Resource Owner Password Credentials.
RFC 9700 indica que este grant no debe utilizarse. La persona responsable del
proyecto aceptó explícitamente esta desviación para satisfacer una demostración
académica de alcance controlado.

Mitigaciones:

- cliente confidencial y secreto solo en backend;
- TLS y cookies `Secure` en AWS;
- access y refresh tokens inaccesibles a JavaScript;
- CSRF firmado y `SameSite=Strict`;
- errores genéricos y limitación de tasa del login;
- validación JWT completa y roles exclusivos de `academic-api`;
- sesión del navegador no persistente;
- documentación explícita de migración futura.
- cabeceras de seguridad en CloudFront y throttling del endpoint de login.

La mitigación reduce exposición, pero no convierte Direct Access Grants en el
flujo recomendado ni habilita MFA correctamente.

AWS WAF se difiere para el demo efímero por el criterio de costo aceptado. Un
despliegue duradero debe agregar protección administrada y límites por IP contra
credential stuffing; el throttling de API Gateway no sustituye ese control.

## Consecuencias

- El usuario permanece en el dominio del portal durante login y logout.
- El frontend deja de depender de `angular-oauth2-oidc`, `jwt-decode` y
  almacenamiento web de tokens.
- API Gateway debe invocar el authorizer aunque falte `Authorization`, porque la
  identidad puede llegar en cookie.
- CloudFront debe reenviar cookies y `X-CSRF-Token` sin cachear `/v1/*`.
- El secreto BFF y la clave CSRF deben rotarse si se exponen.
- Una implementación productiva debe migrar a Authorization Code + PKCE o a un
  flujo administrado por el IdP, aceptando la redirección correspondiente.

## Evidencia para presentación

El portal controla la experiencia visual; Keycloak sigue controlando identidad
y permisos; el navegador nunca puede leer los tokens. La limitación de Direct
Grant se presenta como una decisión consciente, documentada y temporal.

## Referencias

- [Keycloak: OpenID Connect endpoints](https://www.keycloak.org/securing-apps/oidc-layers)
- [RFC 9700 §2.4: Resource Owner Password Credentials](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.4)
- [AWS: Lambda authorizers para HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html)
