"""
Módulo de Integración con Apache Kafka para Entornos Serverless (AWS Lambda y FastAPI).
Implementa inicialización perezosa (Lazy Initialization), reutilización de conexiones
en contextos calientes (Warm Starts) y confirmación síncrona mediante flush() para
garantizar la entrega de eventos antes del congelamiento del contenedor Lambda.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from kafka import KafkaProducer
from kafka.errors import KafkaError
from dotenv import load_dotenv

# Cargar variables de entorno prioritariamente desde .env y soporte fallback a env
load_dotenv()
if not os.getenv("KAFKA_BOOTSTRAP_SERVERS") and os.path.exists("env"):
    load_dotenv("env")

# Configuración de Logging
logger = logging.getLogger("kafka_producer")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Configuración de Tópicos y Broker de Kafka
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_REQUESTS = os.getenv("KAFKA_TOPIC_REQUESTS", "academic-requests")
TOPIC_REVIEWS = os.getenv("KAFKA_TOPIC_REVIEWS", "academic-reviews")
TOPIC_NOTIFICATIONS = os.getenv("KAFKA_TOPIC_NOTIFICATIONS", "academic-notifications")
TOPIC_ANALYTICS = os.getenv("KAFKA_TOPIC_ANALYTICS", "academic-analytics")

# Nombres estandarizados de Eventos de Dominio
EVENT_REQUEST_VALIDATED = "RequestValidated"
EVENT_REQUEST_PREPARED = "RequestPrepared"
EVENT_REVIEW_EVALUATED = "ReviewEvaluated"
EVENT_NOTIFICATION_PREVIEWED = "NotificationPreviewed"
EVENT_ANALYTICS_SUMMARIZED = "AnalyticsSummarized"


def json_serializer(value: Any) -> bytes:
    """Serializa objetos Python a bytes JSON en UTF-8 soportando datetime, UUIDs, etc."""
    return json.dumps(
        value,
        default=lambda o: o.isoformat() if hasattr(o, "isoformat") else str(o),
        ensure_ascii=False
    ).encode("utf-8")


def extract_actor_info(token_payload: dict) -> Tuple[str, list]:
    """Extrae actor_id ('sub') y roles desde el payload JWT validado por Keycloak."""
    actor_id = token_payload.get("sub", "unknown")
    resource_access = token_payload.get("resource_access", {})
    api_resource = resource_access.get("academic-api", {})
    roles = api_resource.get("roles", [])
    return actor_id, roles


class KafkaPublishError(Exception):
    """Excepción lanzada cuando ocurre un fallo al publicar un evento en Kafka."""
    pass


class ServerlessKafkaProducer:
    """
    Cliente productor para Apache Kafka optimizado para Serverless (AWS Lambda).
    Utiliza inicialización perezosa (lazy initialization), preserva conexiones en
    contextos calientes (warm container) y realiza flush() síncrono para garantizar
    la entrega antes de que Lambda congele la CPU.
    """

    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        client_id: str = "academic-requests-lambda-producer"
    ):
        self.bootstrap_servers = bootstrap_servers or KAFKA_BOOTSTRAP_SERVERS
        self.client_id = client_id
        self._producer: Optional[KafkaProducer] = None

    def _get_producer(self) -> KafkaProducer:
        """
        Retorna la instancia activa del productor de Kafka o crea una nueva
        usando inicialización perezosa (lazy).
        """
        if self._producer is None:
            logger.info("Inicializando KafkaProducer hacia %s...", self.bootstrap_servers)
            try:
                self._producer = KafkaProducer(
                    bootstrap_servers=self.bootstrap_servers.split(",") if "," in self.bootstrap_servers else self.bootstrap_servers,
                    value_serializer=json_serializer,
                    client_id=self.client_id,
                    acks="all",
                    retries=2,
                    request_timeout_ms=5000,
                    api_version=(2, 5, 0)
                )
                logger.info("KafkaProducer inicializado exitosamente.")
            except Exception as exc:
                self._producer = None
                logger.error("Error al instanciar KafkaProducer: %s", str(exc), exc_info=True)
                raise KafkaPublishError(f"No fue posible inicializar conexión con Kafka: {str(exc)}") from exc
        return self._producer

    def close(self) -> None:
        """Cierra el productor y libera conexiones."""
        if self._producer is not None:
            try:
                self._producer.flush(timeout=3)
                self._producer.close(timeout=3)
            except Exception as exc:
                logger.warning("Error cerrando KafkaProducer: %s", str(exc))
            finally:
                self._producer = None

    async def send_event(
        self,
        topic: str,
        event_type: str,
        actor: str,
        data: Any,
        key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Genera y emite un evento estructurado a Kafka garantizando su entrega
        mediante flush() antes de finalizar la invocación.
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        event_payload = {
            "event_type": event_type,
            "actor": actor,
            "timestamp": timestamp,
            "data": data
        }

        key_bytes = (key or str(actor)).encode("utf-8") if actor else None

        try:
            producer = self._get_producer()
            # Encolar mensaje en buffer de Kafka
            future = producer.send(topic, value=event_payload, key=key_bytes)
            # CRÍTICO PARA SERVERLESS: Forzar el vaciado del buffer a la red antes del freeze de Lambda
            producer.flush(timeout=5)
            # Esperar la confirmación del broker
            record_metadata = future.get(timeout=5)

            logger.info(
                "Evento '%s' publicado en tópico '%s' [Partición: %d, Offset: %d, Actor: %s]",
                event_type,
                topic,
                record_metadata.partition,
                record_metadata.offset,
                actor
            )
            return event_payload
        except KafkaError as ke:
            logger.error("KafkaError al emitir evento '%s' a tópico '%s': %s", event_type, topic, str(ke), exc_info=True)
            self._producer = None  # Resetear para forzar reconexión limpia en el siguiente evento
            raise KafkaPublishError(f"Error de Kafka al publicar evento: {str(ke)}") from ke
        except Exception as exc:
            logger.error("Fallo inesperado al publicar evento '%s' a tópico '%s': %s", event_type, topic, str(exc), exc_info=True)
            self._producer = None
            raise KafkaPublishError(f"Fallo al publicar evento en Kafka: {str(exc)}") from exc


# Instancia reutilizable en el contexto global de ejecución de Lambda (Warm Starts)
kafka_producer = ServerlessKafkaProducer()

# Alias de compatibilidad retroactiva
KafkaEventProducer = ServerlessKafkaProducer

