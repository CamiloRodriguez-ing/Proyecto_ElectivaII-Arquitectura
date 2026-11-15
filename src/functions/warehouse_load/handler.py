# ruff: noqa: ISC004

import os
import time

import boto3


def lambda_handler(event, context):
    bucket = os.environ["ANALYTICS_BUCKET"]
    sql = [
        "TRUNCATE TABLE dw.stg_requests",
        "TRUNCATE TABLE dw.stg_transitions",
        f"COPY dw.stg_requests FROM 's3://{bucket}/curated/requests/' IAM_ROLE default FORMAT AS PARQUET",
        f"COPY dw.stg_transitions FROM 's3://{bucket}/curated/transitions/' IAM_ROLE default FORMAT AS PARQUET",
        "INSERT INTO dw.dim_date SELECT DISTINCT CAST(TO_CHAR(event_date,'YYYYMMDD') AS INTEGER), event_date, "
        "EXTRACT(dow FROM event_date), EXTRACT(week FROM event_date), EXTRACT(month FROM event_date), "
        "TO_CHAR(event_date,'Month'), EXTRACT(quarter FROM event_date), CASE WHEN EXTRACT(month FROM event_date)<=6 THEN 1 ELSE 2 END, "
        "EXTRACT(year FROM event_date) FROM (SELECT event_date FROM dw.stg_requests UNION SELECT event_date FROM dw.stg_transitions) s "
        "WHERE NOT EXISTS (SELECT 1 FROM dw.dim_date d WHERE d.full_date=s.event_date)",
        "INSERT INTO dw.dim_tenant(tenant_id,tenant_name,valid_from,is_current) SELECT DISTINCT tenant_id,tenant_id,GETDATE(),true "
        "FROM dw.stg_requests s WHERE NOT EXISTS (SELECT 1 FROM dw.dim_tenant d WHERE d.tenant_id=s.tenant_id AND d.is_current)",
        "INSERT INTO dw.dim_request_type(request_type) SELECT DISTINCT request_type FROM dw.stg_requests s "
        "WHERE NOT EXISTS (SELECT 1 FROM dw.dim_request_type d WHERE d.request_type=s.request_type)",
        "INSERT INTO dw.dim_status(status,is_terminal) SELECT DISTINCT status, status IN ('APPROVED','REJECTED','CANCELLED') "
        "FROM (SELECT status FROM dw.stg_requests UNION SELECT new_status status FROM dw.stg_transitions) s "
        "WHERE NOT EXISTS (SELECT 1 FROM dw.dim_status d WHERE d.status=s.status)",
        "INSERT INTO dw.dim_decision(decision) SELECT DISTINCT decision FROM dw.stg_transitions s WHERE decision IS NOT NULL "
        "AND NOT EXISTS (SELECT 1 FROM dw.dim_decision d WHERE d.decision=s.decision)",
        "INSERT INTO dw.dim_course(tenant_id,course_name,valid_from,is_current) "
        "SELECT DISTINCT tenant_id,course_name,GETDATE(),true FROM (SELECT tenant_id,source_course course_name FROM dw.stg_requests "
        "UNION SELECT tenant_id,target_course FROM dw.stg_requests) s WHERE course_name IS NOT NULL AND NOT EXISTS "
        "(SELECT 1 FROM dw.dim_course d WHERE d.tenant_id=s.tenant_id AND d.course_name=s.course_name AND d.is_current)",
        "MERGE INTO dw.fact_request f USING (SELECT s.*,t.tenant_key,rt.request_type_key,st.status_key,sc.course_key source_course_key,"
        "tc.course_key target_course_key,CAST(TO_CHAR(s.event_date,'YYYYMMDD') AS INTEGER) date_key FROM dw.stg_requests s "
        "JOIN dw.dim_tenant t ON t.tenant_id=s.tenant_id AND t.is_current JOIN dw.dim_request_type rt ON rt.request_type=s.request_type "
        "JOIN dw.dim_status st ON st.status=s.status LEFT JOIN dw.dim_course sc ON sc.tenant_id=s.tenant_id AND sc.course_name=s.source_course AND sc.is_current "
        "LEFT JOIN dw.dim_course tc ON tc.tenant_id=s.tenant_id AND tc.course_name=s.target_course AND tc.is_current) x ON f.request_id=x.request_id "
        "WHEN MATCHED THEN UPDATE SET status_key=x.status_key,updated_at=x.occurred_at "
        "WHEN NOT MATCHED THEN INSERT(request_id,tenant_key,request_type_key,status_key,source_course_key,target_course_key,submitted_date_key,"
        "source_credits,target_credits,updated_at) VALUES(x.request_id,x.tenant_key,x.request_type_key,x.status_key,x.source_course_key,x.target_course_key,"
        "x.date_key,x.source_credits,x.target_credits,x.occurred_at)",
        "MERGE INTO dw.fact_status_transition f USING (SELECT s.*,t.tenant_key,ps.status_key previous_status_key,ns.status_key new_status_key,"
        "CAST(TO_CHAR(s.event_date,'YYYYMMDD') AS INTEGER) date_key FROM dw.stg_transitions s JOIN dw.dim_tenant t ON t.tenant_id=s.tenant_id AND t.is_current "
        "LEFT JOIN dw.dim_status ps ON ps.status=s.previous_status JOIN dw.dim_status ns ON ns.status=s.new_status) x ON f.event_id=x.event_id "
        "WHEN NOT MATCHED THEN INSERT(event_id,request_id,tenant_key,date_key,previous_status_key,new_status_key,occurred_at) "
        "VALUES(x.event_id,x.request_id,x.tenant_key,x.date_key,x.previous_status_key,x.new_status_key,x.occurred_at)",
        "MERGE INTO dw.fact_review f USING (SELECT s.*,t.tenant_key,d.decision_key,CAST(TO_CHAR(s.event_date,'YYYYMMDD') AS INTEGER) date_key,"
        "DATEDIFF(second,s.submitted_at,s.occurred_at)/3600.0 response_hours FROM dw.stg_transitions s "
        "JOIN dw.dim_tenant t ON t.tenant_id=s.tenant_id AND t.is_current JOIN dw.dim_decision d ON d.decision=s.decision WHERE s.decision IS NOT NULL) x "
        "ON f.event_id=x.event_id WHEN NOT MATCHED THEN INSERT(event_id,request_id,tenant_key,decision_key,date_key,reviewer_role,response_hours,occurred_at) "
        "VALUES(x.event_id,x.request_id,x.tenant_key,x.decision_key,x.date_key,x.reviewer_role,x.response_hours,x.occurred_at)",
        "UPDATE dw.fact_request SET status_key=s.status_key,"
        "resolved_date_key=CASE WHEN s.is_terminal THEN CAST(TO_CHAR(x.event_date,'YYYYMMDD') AS INTEGER) ELSE NULL END,"
        "is_approved=CASE WHEN s.status='APPROVED' THEN 1 ELSE 0 END,"
        "is_rejected=CASE WHEN s.status='REJECTED' THEN 1 ELSE 0 END,"
        "review_count=x.review_count,changes_requested_count=x.changes_requested_count,"
        "resolution_hours=CASE WHEN s.is_terminal THEN DATEDIFF(second,x.submitted_at,x.occurred_at)/3600.0 ELSE NULL END,"
        "updated_at=x.occurred_at FROM (SELECT request_id,new_status,occurred_at,event_date,submitted_at,"
        "COUNT(*) OVER(PARTITION BY request_id) review_count,"
        "SUM(CASE WHEN new_status='CHANGES_REQUESTED' THEN 1 ELSE 0 END) OVER(PARTITION BY request_id) changes_requested_count,"
        "ROW_NUMBER() OVER(PARTITION BY request_id ORDER BY occurred_at DESC,event_id DESC) row_number "
        "FROM dw.stg_transitions) x JOIN dw.dim_status s ON s.status=x.new_status "
        "WHERE fact_request.request_id=x.request_id AND x.row_number=1",
        "DELETE FROM dw.fact_request_daily_snapshot WHERE date_key=CAST(TO_CHAR(GETDATE(),'YYYYMMDD') AS INTEGER)",
        "INSERT INTO dw.fact_request_daily_snapshot(request_id,date_key,tenant_key,request_type_key,status_key,open_request_count) "
        "SELECT f.request_id,CAST(TO_CHAR(GETDATE(),'YYYYMMDD') AS INTEGER),f.tenant_key,f.request_type_key,f.status_key,1 FROM dw.fact_request f "
        "JOIN dw.dim_status s ON s.status_key=f.status_key WHERE NOT s.is_terminal",
        "REFRESH MATERIALIZED VIEW mart.mv_cube_requests",
        "REFRESH MATERIALIZED VIEW mart.mv_cube_equivalences",
        "REFRESH MATERIALIZED VIEW mart.mv_cube_processing",
    ]
    client = boto3.client("redshift-data")
    response = client.batch_execute_statement(
        WorkgroupName=os.environ["REDSHIFT_WORKGROUP"], Database=os.environ.get("REDSHIFT_DATABASE", "analytics"), Sqls=sql,
    )
    while True:
        status = client.describe_statement(Id=response["Id"])
        if status["Status"] == "FINISHED":
            return {"status": "loaded", "statement_id": response["Id"]}
        if status["Status"] in {"FAILED", "ABORTED"}:
            raise RuntimeError(status.get("Error", "Warehouse load failed"))
        time.sleep(1)
