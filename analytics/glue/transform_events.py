"""AWS Glue job: normalize immutable event JSON into partitioned Parquet."""

import sys

from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql import functions as F

args = getResolvedOptions(sys.argv, ["JOB_NAME", "RAW_PATH", "CURATED_PATH"])
context = GlueContext(SparkContext.getOrCreate())
job = Job(context)
job.init(args["JOB_NAME"], args)

events = context.spark_session.read.option("recursiveFileLookup", "true").json(args["RAW_PATH"])
normalized = (
    events.dropDuplicates(["event_id"])
    .withColumn("occurred_timestamp", F.to_timestamp("occurred_at"))
    .withColumn("event_date", F.to_date("occurred_timestamp"))
    .withColumn("year", F.year("occurred_timestamp"))
    .withColumn("month", F.month("occurred_timestamp"))
    .withColumn("day", F.dayofmonth("occurred_timestamp"))
    .select("event_id", "event_type", "aggregate_id", "tenant_id", "occurred_timestamp", "event_date", "actor", "data")
)
requests = normalized.filter(F.col("event_type") == "request.submitted.v1").select(
    "event_id", F.col("aggregate_id").alias("request_id"), "tenant_id",
    F.col("data.type").alias("request_type"), F.col("data.status").alias("status"),
    F.col("data.source_course").alias("source_course"), F.col("data.target_course").alias("target_course"),
    F.col("data.source_credits").cast("int").alias("source_credits"),
    F.col("data.target_credits").cast("int").alias("target_credits"),
    F.col("data.student_key").alias("student_key"), F.col("occurred_timestamp").alias("occurred_at"), "event_date",
)
transitions = normalized.filter(F.col("event_type") == "request.status_changed.v1").select(
    "event_id", F.col("aggregate_id").alias("request_id"), "tenant_id",
    F.col("data.previous_status").alias("previous_status"), F.col("data.new_status").alias("new_status"),
    F.col("data.decision").alias("decision"), F.col("data.reviewer_role").alias("reviewer_role"),
    F.col("occurred_timestamp").alias("occurred_at"), F.to_timestamp("data.submitted_at").alias("submitted_at"), "event_date",
)
requests.write.mode("overwrite").parquet(f"{args['CURATED_PATH'].rstrip('/')}/requests/")
transitions.write.mode("overwrite").parquet(f"{args['CURATED_PATH'].rstrip('/')}/transitions/")
job.commit()
