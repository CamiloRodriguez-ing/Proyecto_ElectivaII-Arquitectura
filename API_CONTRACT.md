# Contrato de API - Proyecto Electiva II (Academic Requests API)

## Configuración Global
- **Base URL:** `/v1` (Relativa al dominio configurado, ej: `https://<api-id>.execute-api.<region>.amazonaws.com/v1`)
- **Autenticación:** `Authorization: Bearer <access-token>` de Keycloak en todas las rutas excepto `/health`. El token debe tener audiencia `academic-api`; cada ruta aplica además roles de cliente.
- **Formato por defecto:** `application/json`
- **Estructura de Respuesta General:**
  Todas las respuestas exitosas devuelven los datos bajo la propiedad `data` y metadatos en `meta`:
  ```json
  {
    "data": { ... },
    "meta": {
      "request_id": "uuid",
      "api_version": "v1",
      "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ"
    }
  }
  ```
- **Manejo de Errores General:**
  Cualquier error de negocio o validación devuelve el siguiente formato (400, 422, 409, etc.):
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Mensaje explicativo",
      "details": [{"field": "campo", "reason": "Razón del error"}]
    },
    "meta": {
      "request_id": "uuid",
      "api_version": "v1"
    }
  }
  ```

---

## Matriz de autorización

| Ruta | Roles permitidos |
|---|---|
| `GET /health` | Pública |
| `POST /requests/validate` | `STUDENT`, `ADMINISTRATOR` |
| `POST /requests/prepare` | `STUDENT`, `ADMINISTRATOR` |
| `POST /reviews/evaluate` | `REVIEWER`, `ADMINISTRATOR` |
| `POST /notifications/preview` | `REVIEWER`, `NOTIFICATION_SERVICE`, `ADMINISTRATOR` |
| `POST /analytics/summary` | `ANALYST`, `ADMINISTRATOR` |

Una credencial ausente produce `401`; un token inválido o sin un rol permitido produce `403` desde el Lambda authorizer. En evaluaciones, la API ignora cualquier identidad de actor enviada por el cliente y usa `sub` y los roles del token. Si Kafka no confirma el evento posterior a una operación exitosa, la API devuelve `503 EVENT_PUBLISH_UNAVAILABLE` para que el cliente reintente.

---

## 1. Módulo: Salud y Monitoreo (Health)

### Endpoint 1.1: Verificar estado de la API
- **URL:** `/health`
- **Método:** `GET`
- **Propósito:** Confirmar que la API está disponible y operando correctamente.

#### Petición (Request)
- **Headers:** `x-request-id` (opcional), `Origin`

#### Respuesta Exitosa (Response - 200 OK)
```json
{
  "data": {
    "service": "academic-requests-api",
    "status": "ok",
    "version": "v1"
  },
  "meta": {
    "request_id": "...",
    "api_version": "v1",
    "timestamp": "..."
  }
}
```

---

## 2. Módulo: Solicitudes Académicas (Requests)

### Endpoint 2.1: Validar Solicitud
- **URL:** `/requests/validate`
- **Método:** `POST`
- **Propósito:** Validar de forma preliminar que los datos de una solicitud académica cumplan con las reglas de negocio, sin guardarla.

#### Petición (Request - Body)
```json
{
  "type": "CREDIT_TRANSFER",
  "student": {
    "student_code": "123456",
    "name": "Nombre Estudiante",
    "email": "estudiante@universidad.edu.co"
  },
  "academic_data": {
    "source_course": "Materia Origen",
    "target_course": "Materia Destino",
    "source_credits": 3,
    "target_credits": 3
  },
  "documents": [
    {
      "name": "certificado.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 102400
    }
  ]
}
```

#### Respuesta Exitosa (Response - 200 OK)
```json
{
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Files are represented only by metadata at this stage"
    ]
  },
  "meta": { ... }
}
```

#### Manejo de Errores Esperado
- **422 Unprocessable Entity:** Faltan datos o no cumplen el formato (ej. correo sin dominio .edu.co, archivo no es PDF o excede el límite de 10MB). Devuelve una lista de `details` detallando campo por campo.

---

### Endpoint 2.2: Preparar Solicitud
- **URL:** `/requests/prepare`
- **Método:** `POST`
- **Propósito:** Crear e inicializar una nueva solicitud académica (estado `SUBMITTED`).

#### Petición (Request - Body)
*(Misma estructura de JSON que el Endpoint de Validación 2.1)*

#### Respuesta Exitosa (Response - 201 Created)
```json
{
  "data": {
    "type": "CREDIT_TRANSFER",
    "student": { ... },
    "academic_data": { ... },
    "documents": [ ... ],
    "request_id": "uuid-generado",
    "status": "SUBMITTED",
    "observations": [],
    "created_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
    "updated_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
    "version": 1
  },
  "meta": { ... }
}
```

#### Manejo de Errores Esperado
- **400 Bad Request:** Cuerpo JSON inválido.
- **422 Unprocessable Entity:** `VALIDATION_ERROR` si los campos enviados no cumplen las reglas de negocio.

---

## 3. Módulo: Evaluaciones de Solicitudes (Reviews)

### Endpoint 3.1: Evaluar Solicitud
- **URL:** `/reviews/evaluate`
- **Método:** `POST`
- **Propósito:** Registrar la decisión tomada por un revisor (Aprobar, Rechazar o Solicitar Cambios) sobre una solicitud.

#### Petición (Request - Body)
```json
{
  "request": {
    "request_id": "uuid-de-la-solicitud",
    "status": "SUBMITTED",
    "version": 1
  },
  "evaluation": {
    "decision": "APPROVE", 
    "actor": {
      "id": "actor-id",
      "role": "coordinador"
    },
    "observation": "Cumple con los requisitos."
  }
}
```
*(Decisiones válidas: `APPROVE`, `REJECT`, `REQUEST_CHANGES`)*

#### Respuesta Exitosa (Response - 200 OK)
```json
{
  "data": {
    "request": {
      "request_id": "...",
      "status": "APPROVED",
      "version": 2,
      "updated_at": "YYYY-MM-DDTHH:mm:ss.sssZ"
    },
    "event": {
      "event_id": "...",
      "event_type": "request.status_changed.v1",
      "aggregate_type": "request",
      "aggregate_id": "...",
      "occurred_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "schema_version": 1,
      "data": {
        "previous_status": "SUBMITTED",
        "new_status": "APPROVED"
      }
    }
  },
  "meta": { ... }
}
```

#### Manejo de Errores Esperado
- **409 Conflict:** `STATE_TRANSITION_NOT_ALLOWED` cuando se intenta evaluar una solicitud en un estado que no lo permite (diferente a `SUBMITTED` o `UNDER_REVIEW`).
- **422 Unprocessable Entity:** `VALIDATION_ERROR` cuando falta la observación o el actor.

---

## 4. Módulo: Notificaciones y Analítica

### Endpoint 4.1: Previsualizar Notificación
- **URL:** `/notifications/preview`
- **Método:** `POST`
- **Propósito:** Previsualizar el mensaje o correo que se enviaría por el cambio de estado de una solicitud.

#### Petición (Request - Body)
```json
{
  "event": {
    "event_type": "request.status_changed.v1",
    "data": {
      "new_status": "APPROVED"
    }
  },
  "recipient": {
    "email": "estudiante@universidad.edu.co"
  }
}
```

#### Respuesta Exitosa (Response - 200 OK)
```json
{
  "data": {
    "channel": "EMAIL",
    "recipient": "estudiante@universidad.edu.co",
    "subject": "Academic request approved",
    "body": "Your academic request status changed to APPROVED.",
    "event_type": "request.status_changed.v1"
  },
  "meta": { ... }
}
```

---

### Endpoint 4.2: Resumen Analítico
- **URL:** `/analytics/summary`
- **Método:** `POST`
- **Propósito:** Generar métricas resumen a partir de un listado de solicitudes proveídas.

#### Petición (Request - Body)
```json
{
  "requests": [
    {
      "type": "CREDIT_TRANSFER",
      "status": "APPROVED"
    }
  ]
}
```
*(Nota: Límite máximo de 100 solicitudes en el listado).*

#### Respuesta Exitosa (Response - 200 OK)
```json
{
  "data": {
    "total": 1,
    "by_type": {
      "CREDIT_TRANSFER": 1
    },
    "by_status": {
      "APPROVED": 1
    },
    "approval_percentage": 100.0,
    "rejection_percentage": 0,
    "average_resolution_hours": 0,
    "changes_requested": 0
  },
  "meta": { ... }
}
```
#### Manejo de Errores Esperado
- **422 Unprocessable Entity:** `VALIDATION_ERROR` si el arreglo excede los 100 items.
