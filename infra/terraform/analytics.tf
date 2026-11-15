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
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_object" "glue_transform" {
  count  = var.analytics_enabled ? 1 : 0
  bucket = aws_s3_bucket.analytics[0].id
  key    = "jobs/transform_events.py"
  source = "${path.module}/../../analytics/glue/transform_events.py"
  etag   = filemd5("${path.module}/../../analytics/glue/transform_events.py")
}

resource "aws_iam_role" "analytics" {
  count = var.analytics_enabled ? 1 : 0
  name  = "${local.name_prefix}-analytics"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = ["glue.amazonaws.com", "redshift-serverless.amazonaws.com"] }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "analytics" {
  count = var.analytics_enabled ? 1 : 0
  role  = aws_iam_role.analytics[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.analytics[0].arn, "${aws_s3_bucket.analytics[0].arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "glue:GetConnection"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_glue_catalog_database" "analytics" {
  count = var.analytics_enabled ? 1 : 0
  name  = replace("${local.name_prefix}-analytics", "-", "_")
}

resource "aws_glue_job" "transform" {
  count             = var.analytics_enabled ? 1 : 0
  name              = "${local.name_prefix}-transform-events"
  role_arn          = aws_iam_role.analytics[0].arn
  glue_version      = "5.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  command {
    name            = "glueetl"
    python_version  = "3"
    script_location = "s3://${aws_s3_bucket.analytics[0].id}/${aws_s3_object.glue_transform[0].key}"
  }
  default_arguments = {
    "--job-language"                     = "python"
    "--enable-metrics"                   = "true"
    "--enable-continuous-cloudwatch-log" = "true"
    "--RAW_PATH"                         = "s3://${aws_s3_bucket.analytics[0].id}/raw/"
    "--CURATED_PATH"                     = "s3://${aws_s3_bucket.analytics[0].id}/curated/"
  }
}

resource "aws_glue_trigger" "transform" {
  count    = var.analytics_enabled ? 1 : 0
  name     = "${local.name_prefix}-transform-schedule"
  type     = "SCHEDULED"
  schedule = "cron(0/30 * * * ? *)"
  enabled  = true
  actions { job_name = aws_glue_job.transform[0].name }
}

resource "random_password" "redshift" {
  count            = var.analytics_enabled ? 1 : 0
  length           = 32
  special          = true
  override_special = "!#$%&*+-.:=?@_"
}

resource "aws_redshiftserverless_namespace" "this" {
  count                = var.analytics_enabled ? 1 : 0
  namespace_name       = "${local.name_prefix}-analytics"
  db_name              = "analytics"
  admin_username       = "analytics_admin"
  admin_user_password  = random_password.redshift[0].result
  iam_roles            = [aws_iam_role.analytics[0].arn]
  default_iam_role_arn = aws_iam_role.analytics[0].arn

  lifecycle {
    precondition {
      condition     = var.analytics_pseudonym_salt != "replace-before-enabling-analytics"
      error_message = "Set analytics_pseudonym_salt to a deployment-specific secret before enabling analytics."
    }
  }
}

resource "aws_security_group" "redshift" {
  count  = var.analytics_enabled ? 1 : 0
  name   = "${local.name_prefix}-redshift"
  vpc_id = aws_vpc.msk.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_redshiftserverless_workgroup" "this" {
  count               = var.analytics_enabled ? 1 : 0
  workgroup_name      = "${local.name_prefix}-analytics"
  namespace_name      = aws_redshiftserverless_namespace.this[0].namespace_name
  base_capacity       = var.redshift_base_capacity
  publicly_accessible = false
  subnet_ids          = aws_subnet.msk[*].id
  security_group_ids  = [aws_security_group.redshift[0].id]
  config_parameter {
    parameter_key   = "enable_user_activity_logging"
    parameter_value = "true"
  }
}

resource "aws_lambda_event_source_mapping" "analytics" {
  count             = var.analytics_enabled && var.create_msk_serverless ? 1 : 0
  event_source_arn  = aws_msk_serverless_cluster.this[0].arn
  function_name     = aws_lambda_function.this["analytics-ingest"].arn
  topics            = ["academic-requests", "academic-reviews"]
  starting_position = "TRIM_HORIZON"
  batch_size        = 100
  amazon_managed_kafka_event_source_config { consumer_group_id = "academic-olap-ingestion-v1" }
}

resource "aws_cloudwatch_event_rule" "outbox" {
  count               = var.persistence_enabled ? 1 : 0
  name                = "${local.name_prefix}-outbox"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "outbox" {
  count     = var.persistence_enabled ? 1 : 0
  rule      = aws_cloudwatch_event_rule.outbox[0].name
  target_id = "outbox-publisher"
  arn       = aws_lambda_function.this["outbox-publisher"].arn
}

resource "aws_lambda_permission" "outbox_schedule" {
  count         = var.persistence_enabled ? 1 : 0
  statement_id  = "AllowEventBridgeOutbox"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["outbox-publisher"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.outbox[0].arn
}

resource "aws_cloudwatch_event_rule" "warehouse_load" {
  count               = var.analytics_enabled ? 1 : 0
  name                = "${local.name_prefix}-warehouse-load"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "warehouse_load" {
  count     = var.analytics_enabled ? 1 : 0
  rule      = aws_cloudwatch_event_rule.warehouse_load[0].name
  target_id = "warehouse-loader"
  arn       = aws_lambda_function.this["warehouse-load"].arn
}

resource "aws_lambda_permission" "warehouse_schedule" {
  count         = var.analytics_enabled ? 1 : 0
  statement_id  = "AllowEventBridgeWarehouseLoad"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["warehouse-load"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.warehouse_load[0].arn
}
