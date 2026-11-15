CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_requests (
    request_id uuid PRIMARY KEY,
    tenant_id text NOT NULL,
    owner_subject text NOT NULL,
    request_type text NOT NULL,
    status text NOT NULL,
    student jsonb NOT NULL,
    academic_data jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    resolved_at timestamptz,
    idempotency_key text,
    UNIQUE (tenant_id, owner_subject, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_requests_tenant_created
    ON academic_requests (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_requests_tenant_status_created
    ON academic_requests (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_requests_owner_created
    ON academic_requests (owner_subject, created_at DESC);

CREATE TABLE IF NOT EXISTS request_documents (
    document_id uuid PRIMARY KEY,
    request_id uuid REFERENCES academic_requests(request_id) ON DELETE CASCADE,
    tenant_id text NOT NULL,
    owner_subject text NOT NULL,
    object_key text NOT NULL UNIQUE,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10000000),
    checksum_sha256 text,
    upload_status text NOT NULL DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_documents_request ON request_documents (request_id);

CREATE TABLE IF NOT EXISTS request_reviews (
    review_id uuid PRIMARY KEY,
    request_id uuid NOT NULL REFERENCES academic_requests(request_id) ON DELETE CASCADE,
    tenant_id text NOT NULL,
    decision text NOT NULL,
    observation text NOT NULL,
    actor_subject text NOT NULL,
    actor_role text NOT NULL,
    previous_status text NOT NULL,
    new_status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_reviews_request_created
    ON request_reviews (request_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id uuid PRIMARY KEY,
    request_id uuid NOT NULL REFERENCES academic_requests(request_id) ON DELETE CASCADE,
    tenant_id text NOT NULL,
    recipient_subject text NOT NULL,
    recipient_email text NOT NULL,
    status text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    source_event_id uuid NOT NULL UNIQUE,
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notifications_recipient_created
    ON notifications (tenant_id, recipient_subject, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
    event_id uuid PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    topic text NOT NULL,
    event_type text NOT NULL,
    schema_version integer NOT NULL DEFAULT 1,
    correlation_id text NOT NULL,
    actor_subject text NOT NULL,
    actor_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
    tenant_id text NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    last_error text
);
CREATE INDEX IF NOT EXISTS ix_outbox_pending
    ON outbox_events (occurred_at) WHERE published_at IS NULL;

