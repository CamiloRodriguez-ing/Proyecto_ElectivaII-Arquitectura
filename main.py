import os
from typing import List, Optional, Callable
import requests
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from mangum import Mangum

# pyrefly: ignore [missing-import]
from kafka_producer import (
    kafka_producer,
    extract_actor_info,
    TOPIC_REQUESTS,
    TOPIC_REVIEWS,
    TOPIC_NOTIFICATIONS,
    TOPIC_ANALYTICS,
    EVENT_REQUEST_VALIDATED,
    EVENT_REQUEST_PREPARED,
    EVENT_REVIEW_EVALUATED,
    EVENT_NOTIFICATION_PREVIEWED,
    EVENT_ANALYTICS_SUMMARIZED,
    KafkaPublishError,
)

# Cargar variables de entorno desde .env (con fallback a env si aplica)
load_dotenv()
if not os.getenv("KEYCLOAK_SERVER_URL") and os.path.exists("env"):
    load_dotenv("env")

KEYCLOAK_SERVER_URL = os.getenv("KEYCLOAK_SERVER_URL")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM")

if not KEYCLOAK_SERVER_URL or not KEYCLOAK_REALM:
    raise ValueError("Error: KEYCLOAK_SERVER_URL o KEYCLOAK_REALM no están definidas en el entorno o archivo .env")

ISSUER = f"{KEYCLOAK_SERVER_URL}/realms/{KEYCLOAK_REALM}"
JWKS_URL = f"{ISSUER}/protocol/openid-connect/certs"
EXPECTED_AUDIENCE = "academic-api"  # Cliente API de Keycloak

# Cache local para las claves públicas (JWKS)
jwks_cache: Optional[dict] = None


def get_jwks() -> dict:
    global jwks_cache
    if jwks_cache is None:
        response = requests.get(JWKS_URL, timeout=10)
        response.raise_for_status()
        jwks_cache = response.json()
    return jwks_cache


security_scheme = HTTPBearer()


# Validación del Token JWT
async def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido, expirado o con emisor/audiencia incorrecta",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Obtener el encabezado unverified para identificar el 'kid' (Key ID)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise credentials_exception

        jwks = get_jwks()
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e")
                }
                break

        if not rsa_key:
            # Si la clave no está en caché, refrescar e intentar de nuevo
            global jwks_cache
            jwks_cache = None
            jwks = get_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = key
                    break
            if not rsa_key:
                raise credentials_exception

        # Validación del JWT: Firma, Expiración (exp), Emisor (iss) y Audiencia (aud)
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=EXPECTED_AUDIENCE,
            issuer=ISSUER
        )
        return payload

    except JWTError:
        raise credentials_exception


# Verificación de Roles del Cliente (Role-Based Access Control)
def require_roles(allowed_roles: List[str]) -> Callable:
    async def role_checker(payload: dict = Depends(verify_jwt)) -> dict:
        # Extraer los roles explícitamente desde resource_access.academic-api.roles
        resource_access = payload.get("resource_access", {})
        api_resource = resource_access.get("academic-api", {})
        user_roles: List[str] = api_resource.get("roles", [])

        # Verificar si existe coincidencia entre los roles requeridos y los del usuario
        has_permission = any(role in user_roles for role in allowed_roles)

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes los permisos requeridos para ejecutar esta acción"
            )

        return payload

    return role_checker


# Aplicación FastAPI Serverless (sin handlers de ciclo de vida bloqueantes)
app = FastAPI(
    title="Student Requests API",
    version="1.0.0",
    description="Stateless academic request API securizada con Keycloak y emisión de eventos en Apache Kafka"
)


# Manejador de excepciones para errores de publicación en Kafka
@app.exception_handler(KafkaPublishError)
async def kafka_publish_error_handler(request: Request, exc: KafkaPublishError):
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": f"Error al emitir evento al bus de Kafka: {str(exc)}"}
    )


# 1. Endpoint Público (No requiere autenticación)
@app.get("/v1/health", status_code=200)
async def get_health():
    return {"status": "ok", "message": "Service health"}


# 2. Endpoints para Estudiantes y Administradores
@app.post("/v1/requests/validate", status_code=200)
async def validate_request(
    data: dict,
    token_payload: dict = Depends(require_roles(["STUDENT", "ADMINISTRATOR"]))
):
    actor_id, roles = extract_actor_info(token_payload)

    # Emisión a Kafka (con flush síncrono compatible con Serverless)
    await kafka_producer.send_event(
        topic=TOPIC_REQUESTS,
        event_type=EVENT_REQUEST_VALIDATED,
        actor=actor_id,
        data=data
    )

    return {"message": "Validation result", "actor": actor_id, "data": data}


@app.post("/v1/requests/prepare", status_code=201)
async def prepare_request(
    data: dict,
    token_payload: dict = Depends(require_roles(["STUDENT", "ADMINISTRATOR"]))
):
    actor_id, roles = extract_actor_info(token_payload)

    await kafka_producer.send_event(
        topic=TOPIC_REQUESTS,
        event_type=EVENT_REQUEST_PREPARED,
        actor=actor_id,
        data=data
    )

    return {"message": "Prepared non-persisted request", "actor": actor_id, "data": data}


# 3. Endpoint para Revisores y Administradores
@app.post("/v1/reviews/evaluate", status_code=200)
async def evaluate_request(
    data: dict,
    token_payload: dict = Depends(require_roles(["REVIEWER", "ADMINISTRATOR"]))
):
    actor_id, roles = extract_actor_info(token_payload)

    await kafka_producer.send_event(
        topic=TOPIC_REVIEWS,
        event_type=EVENT_REVIEW_EVALUATED,
        actor=actor_id,
        data=data
    )

    return {"message": "Evaluated request and domain event", "actor": actor_id, "data": data}


# 4. Endpoint para Revisores, Servicios de Notificación (Máquina a Máquina) y Administradores
@app.post("/v1/notifications/preview", status_code=200)
async def preview_notification(
    data: dict,
    token_payload: dict = Depends(require_roles(["REVIEWER", "NOTIFICATION_SERVICE", "ADMINISTRATOR"]))
):
    actor_id, roles = extract_actor_info(token_payload)

    await kafka_producer.send_event(
        topic=TOPIC_NOTIFICATIONS,
        event_type=EVENT_NOTIFICATION_PREVIEWED,
        actor=actor_id,
        data=data
    )

    return {"message": "Notification preview", "actor": actor_id, "data": data}


# 5. Endpoint para Analistas y Administradores
@app.post("/v1/analytics/summary", status_code=200)
async def summarize_requests(
    data: dict,
    token_payload: dict = Depends(require_roles(["ANALYST", "ADMINISTRATOR"]))
):
    actor_id, roles = extract_actor_info(token_payload)

    await kafka_producer.send_event(
        topic=TOPIC_ANALYTICS,
        event_type=EVENT_ANALYTICS_SUMMARIZED,
        actor=actor_id,
        data=data
    )

    return {"message": "Analytics summary", "actor": actor_id, "data": data}


# Adaptador Serverless ASGI para AWS Lambda mediante Mangum
handler = Mangum(app, lifespan="off")