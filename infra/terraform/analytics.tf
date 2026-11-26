resource "aws_s3_bucket" "analytics" {
  count         = var.analytics_enabled ? 1 : 0
  bucket_prefix = "${local.name_prefix}-analytics-"
  force_destroy = var.environment != "prod"
}

resource "aws_s3_bucket_public_access_block" "analytics" {
  count                   = var.analytics_enabled ? 1 : 0
  bucket                  = aws_s3_bucket.analytics[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "analytics" {
  count  = var.analytics_enabled ? 1 : 0
  bucket = aws_s3_bucket.analytics[0].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "analytics" {
  count  = var.analytics_enabled ? 1 : 0
  bucket = aws_s3_bucket.analytics[0].id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "analytics" {
  count  = var.analytics_enabled ? 1 : 0
  bucket = aws_s3_bucket.analytics[0].id
  rule {
    id     = "ephemeral-demo-archive"
    status = "Enabled"
    filter {}
    expiration { days = var.environment == "prod" ? 365 : 7 }
    noncurrent_version_expiration { noncurrent_days = var.environment == "prod" ? 365 : 7 }
  }
}

resource "aws_lambda_event_source_mapping" "analytics" {
  count             = var.analytics_enabled && var.create_msk_serverless ? 1 : 0
  event_source_arn  = aws_msk_serverless_cluster.this[0].arn
  function_name     = aws_lambda_function.this["analytics-ingest"].arn
  topics            = ["academic-requests", "academic-reviews"]
  starting_position = "TRIM_HORIZON"
  batch_size        = 100
  amazon_managed_kafka_event_source_config { consumer_group_id = "academic-archive-v2" }
  depends_on = [aws_lambda_invocation.kafka_bootstrap]
}

resource "aws_cloudwatch_event_rule" "outbox" {
  count               = var.persistence_enabled ? 1 : 0
  name                = "${local.name_prefix}-outbox"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "outbox" {
  count      = var.persistence_enabled ? 1 : 0
  rule       = aws_cloudwatch_event_rule.outbox[0].name
  target_id  = "outbox-publisher"
  arn        = aws_lambda_function.this["outbox-publisher"].arn
  depends_on = [aws_lambda_invocation.kafka_bootstrap]
}

resource "aws_lambda_permission" "outbox_schedule" {
  count         = var.persistence_enabled ? 1 : 0
  statement_id  = "AllowEventBridgeOutbox"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["outbox-publisher"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.outbox[0].arn
}
