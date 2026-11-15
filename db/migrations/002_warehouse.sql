-- Redshift-compatible dimensional model. Applied to the analytics warehouse,
-- not to the operational PostgreSQL database.
CREATE SCHEMA IF NOT EXISTS dw;
CREATE SCHEMA IF NOT EXISTS mart;

CREATE TABLE IF NOT EXISTS dw.dim_date (
    date_key integer PRIMARY KEY,
    full_date date NOT NULL,
    day_of_week smallint,
    week_of_year smallint,
    month_number smallint,
    month_name varchar(16),
    quarter_number smallint,
    semester_number smallint,
    year_number smallint
);

CREATE TABLE IF NOT EXISTS dw.dim_tenant (
    tenant_key bigint IDENTITY(1,1),
    tenant_id varchar(128) NOT NULL,
    tenant_name varchar(256),
    valid_from timestamp NOT NULL,
    valid_to timestamp,
    is_current boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.dim_course (
    course_key bigint IDENTITY(1,1),
    tenant_id varchar(128) NOT NULL,
    course_name varchar(512) NOT NULL,
    valid_from timestamp NOT NULL,
    valid_to timestamp,
    is_current boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.dim_request_type (
    request_type_key bigint IDENTITY(1,1),
    request_type varchar(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.dim_status (
    status_key bigint IDENTITY(1,1),
    status varchar(64) NOT NULL,
    is_terminal boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.dim_decision (
    decision_key bigint IDENTITY(1,1),
    decision varchar(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.fact_request (
    request_id varchar(64) NOT NULL,
    tenant_key bigint NOT NULL,
    request_type_key bigint NOT NULL,
    status_key bigint NOT NULL,
    source_course_key bigint,
    target_course_key bigint,
    submitted_date_key integer NOT NULL,
    resolved_date_key integer,
    source_credits integer,
    target_credits integer,
    resolution_hours decimal(18,2),
    review_count integer NOT NULL DEFAULT 0,
    changes_requested_count integer NOT NULL DEFAULT 0,
    is_approved smallint NOT NULL DEFAULT 0,
    is_rejected smallint NOT NULL DEFAULT 0,
    updated_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.fact_status_transition (
    event_id varchar(64) NOT NULL,
    request_id varchar(64) NOT NULL,
    tenant_key bigint NOT NULL,
    date_key integer NOT NULL,
    previous_status_key bigint,
    new_status_key bigint NOT NULL,
    duration_hours decimal(18,2),
    occurred_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.fact_review (
    event_id varchar(64) NOT NULL,
    request_id varchar(64) NOT NULL,
    tenant_key bigint NOT NULL,
    decision_key bigint NOT NULL,
    date_key integer NOT NULL,
    reviewer_role varchar(128),
    response_hours decimal(18,2),
    occurred_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.fact_request_daily_snapshot (
    request_id varchar(64) NOT NULL,
    date_key integer NOT NULL,
    tenant_key bigint NOT NULL,
    request_type_key bigint NOT NULL,
    status_key bigint NOT NULL,
    open_request_count integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS dw.stg_requests (
    event_id varchar(64), request_id varchar(64), tenant_id varchar(128), request_type varchar(128),
    status varchar(64), source_course varchar(512), target_course varchar(512), source_credits integer,
    target_credits integer, student_key varchar(64), occurred_at timestamp, event_date date
);

CREATE TABLE IF NOT EXISTS dw.stg_transitions (
    event_id varchar(64), request_id varchar(64), tenant_id varchar(128), previous_status varchar(64),
    new_status varchar(64), decision varchar(64), reviewer_role varchar(128), occurred_at timestamp,
    submitted_at timestamp, event_date date
);

-- Deploy-time scripts create the materialized views after the initial load.
-- Redshift CUBE produces detail rows, subtotals, and the grand total.
DROP MATERIALIZED VIEW IF EXISTS mart.mv_cube_requests;
CREATE MATERIALIZED VIEW mart.mv_cube_requests AS
SELECT d.year_number, d.month_number, t.tenant_id, rt.request_type, s.status,
       COUNT(*) AS request_count,
       SUM(f.is_approved) AS approved_count,
       SUM(f.is_rejected) AS rejected_count,
       SUM(f.source_credits) AS requested_credits,
       SUM(CASE WHEN f.is_approved = 1 THEN f.target_credits ELSE 0 END) AS approved_credits,
       SUM(f.resolution_hours) AS resolution_hours_sum,
       COUNT(f.resolution_hours) AS resolution_hours_count,
       GROUPING_ID(d.year_number, d.month_number, t.tenant_id, rt.request_type, s.status) AS grouping_id
FROM dw.fact_request f
JOIN dw.dim_date d ON d.date_key = f.submitted_date_key
JOIN dw.dim_tenant t ON t.tenant_key = f.tenant_key
JOIN dw.dim_request_type rt ON rt.request_type_key = f.request_type_key
JOIN dw.dim_status s ON s.status_key = f.status_key
GROUP BY CUBE(d.year_number, d.month_number, t.tenant_id, rt.request_type, s.status);

DROP MATERIALIZED VIEW IF EXISTS mart.mv_cube_equivalences;
CREATE MATERIALIZED VIEW mart.mv_cube_equivalences AS
SELECT d.year_number, d.month_number, t.tenant_id,
       sc.course_name AS source_course, tc.course_name AS target_course, s.status,
       COUNT(*) AS request_count,
       SUM(f.is_approved) AS approved_count,
       SUM(f.is_rejected) AS rejected_count,
       SUM(f.source_credits) AS requested_credits,
       SUM(CASE WHEN f.is_approved = 1 THEN f.target_credits ELSE 0 END) AS approved_credits,
       GROUPING_ID(d.year_number, d.month_number, t.tenant_id, sc.course_name, tc.course_name, s.status) AS grouping_id
FROM dw.fact_request f
JOIN dw.dim_date d ON d.date_key = f.submitted_date_key
JOIN dw.dim_tenant t ON t.tenant_key = f.tenant_key
LEFT JOIN dw.dim_course sc ON sc.course_key = f.source_course_key
LEFT JOIN dw.dim_course tc ON tc.course_key = f.target_course_key
JOIN dw.dim_status s ON s.status_key = f.status_key
GROUP BY CUBE(d.year_number, d.month_number, t.tenant_id, sc.course_name, tc.course_name, s.status);

DROP MATERIALIZED VIEW IF EXISTS mart.mv_cube_processing;
CREATE MATERIALIZED VIEW mart.mv_cube_processing AS
SELECT d.year_number, d.month_number, t.tenant_id, f.reviewer_role, de.decision,
       COUNT(*) AS review_count,
       SUM(f.response_hours) AS response_hours_sum,
       COUNT(f.response_hours) AS response_hours_count,
       GROUPING_ID(d.year_number, d.month_number, t.tenant_id, f.reviewer_role, de.decision) AS grouping_id
FROM dw.fact_review f
JOIN dw.dim_date d ON d.date_key = f.date_key
JOIN dw.dim_tenant t ON t.tenant_key = f.tenant_key
JOIN dw.dim_decision de ON de.decision_key = f.decision_key
GROUP BY CUBE(d.year_number, d.month_number, t.tenant_id, f.reviewer_role, de.decision);
