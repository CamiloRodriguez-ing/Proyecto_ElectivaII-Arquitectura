data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  functions = {
    health = {
      handler = "functions.health.handler.lambda_handler"
      vpc     = false
    }
    authorizer = {
      handler = "functions.keycloak_authorizer.handler.lambda_handler"
      vpc     = false
    }
    auth-session = {
      handler = "functions.auth_session.handler.lambda_handler"
      vpc     = false
    }
    validate-request = {
      handler = "functions.validate_request.handler.lambda_handler"
      vpc     = false
    }
    prepare-request = {
      handler = "functions.prepare_request.handler.lambda_handler"
      vpc     = true
    }
    evaluate-review = {
      handler = "functions.evaluate_review.handler.lambda_handler"
      vpc     = true
    }
    preview-notification = {
      handler = "functions.preview_notification.handler.lambda_handler"
      vpc     = false
    }
    analytics-summary = {
      handler = "functions.analytics_summary.handler.lambda_handler"
      vpc     = true
    }
    request-query = {
      handler = "functions.request_query.handler.lambda_handler"
      vpc     = true
    }
    document-upload = {
      handler = "functions.document_upload.handler.lambda_handler"
      vpc     = true
    }
    document-download = {
      handler = "functions.document_download.handler.lambda_handler"
      vpc     = true
    }
    notification-query = {
      handler = "functions.notification_query.handler.lambda_handler"
      vpc     = true
    }
    outbox-publisher = {
      handler = "functions.outbox_publisher.handler.lambda_handler"
      vpc     = true
    }
    db-migrate = {
      handler = "functions.db_migrate.handler.lambda_handler"
      vpc     = true
    }
    platform-bootstrap = {
      handler = "functions.platform_bootstrap.handler.lambda_handler"
      vpc     = true
    }
    kafka-bootstrap = {
      handler = "functions.kafka_bootstrap.handler.lambda_handler"
      vpc     = true
    }
    demo-seed = {
      handler = "functions.demo_seed.handler.lambda_handler"
      vpc     = true
    }
    analytics-ingest = {
      handler = "functions.analytics_ingest.handler.lambda_handler"
      vpc     = false
    }
    analytics-cube = {
      handler = "functions.analytics_cube.handler.lambda_handler"
      vpc     = true
    }
  }

  routes = {
    health = {
      route_key     = "GET /v1/health"
      function_key  = "health"
      authorization = "NONE"
    }
    auth-login = {
      route_key     = "POST /v1/auth/login"
      function_key  = "auth-session"
      authorization = "NONE"
    }
    auth-refresh = {
      route_key     = "POST /v1/auth/refresh"
      function_key  = "auth-session"
      authorization = "NONE"
    }
    auth-logout = {
      route_key     = "POST /v1/auth/logout"
      function_key  = "auth-session"
      authorization = "NONE"
    }
    auth-me = {
      route_key     = "GET /v1/auth/me"
      function_key  = "auth-session"
      authorization = "CUSTOM"
    }
    validate-request = {
      route_key     = "POST /v1/requests/validate"
      function_key  = "validate-request"
      authorization = "CUSTOM"
    }
    prepare-request = {
      route_key     = "POST /v1/requests/prepare"
      function_key  = "prepare-request"
      authorization = "CUSTOM"
    }
    list-requests = {
      route_key     = "GET /v1/requests"
      function_key  = "request-query"
      authorization = "CUSTOM"
    }
    get-request = {
      route_key     = "GET /v1/requests/{request_id}"
      function_key  = "request-query"
      authorization = "CUSTOM"
    }
    document-upload = {
      route_key     = "POST /v1/documents/upload-url"
      function_key  = "document-upload"
      authorization = "CUSTOM"
    }
    document-download = {
      route_key     = "GET /v1/documents/{document_id}/download-url"
      function_key  = "document-download"
      authorization = "CUSTOM"
    }
    evaluate-review = {
      route_key     = "POST /v1/reviews/evaluate"
      function_key  = "evaluate-review"
      authorization = "CUSTOM"
    }
    preview-notification = {
      route_key     = "POST /v1/notifications/preview"
      function_key  = "preview-notification"
      authorization = "CUSTOM"
    }
    list-notifications = {
      route_key     = "GET /v1/notifications"
      function_key  = "notification-query"
      authorization = "CUSTOM"
    }
    read-notification = {
      route_key     = "PATCH /v1/notifications/{notification_id}/read"
      function_key  = "notification-query"
      authorization = "CUSTOM"
    }
    analytics-summary = {
      route_key     = "GET /v1/analytics/summary"
      function_key  = "analytics-summary"
      authorization = "CUSTOM"
    }
    analytics-cube = {
      route_key     = "GET /v1/analytics/cube/requests"
      function_key  = "analytics-cube"
      authorization = "CUSTOM"
    }
    analytics-equivalences = {
      route_key     = "GET /v1/analytics/cube/equivalences"
      function_key  = "analytics-cube"
      authorization = "CUSTOM"
    }
    analytics-processing = {
      route_key     = "GET /v1/analytics/cube/processing-times"
      function_key  = "analytics-cube"
      authorization = "CUSTOM"
    }
  }

  source_root    = abspath("${path.module}/../../src")
  migration_root = abspath("${path.module}/../../db/migrations")
  source_hash = sha256(join("", concat(
    [for file in sort(fileset(local.source_root, "**")) : filesha256("${local.source_root}/${file}") if !endswith(file, ".pyc") && !strcontains(file, "__pycache__/")],
    [filesha256("${local.source_root}/requirements.txt")],
    [for file in sort(fileset(local.migration_root, "*.sql")) : filesha256("${local.migration_root}/${file}")],
  )))

  effective_subnet_ids         = aws_subnet.msk[*].id
  effective_security_group_ids = [aws_security_group.lambda.id]
  effective_bootstrap_servers = var.create_msk_serverless ? one(
    data.aws_msk_bootstrap_brokers.managed[*].bootstrap_brokers_sasl_iam
  ) : var.kafka_bootstrap_servers
  effective_security_protocol = var.create_msk_serverless ? "SASL_SSL" : var.kafka_security_protocol
  effective_sasl_mechanism    = var.create_msk_serverless ? "AWS_MSK_IAM" : var.kafka_sasl_mechanism
}

resource "terraform_data" "configuration_guard" {
  lifecycle {
    precondition {
      condition = !var.deploy_full_stack || (
        var.analytics_enabled && var.persistence_enabled && var.kafka_enabled && var.create_msk_serverless
      )
      error_message = "deploy_full_stack requires analytics, persistence, Kafka, and MSK Serverless."
    }

    precondition {
      condition = !var.load_demo_dataset || (
        var.environment == "dev" && var.persistence_enabled && var.kafka_enabled && var.create_msk_serverless
      )
      error_message = "load_demo_dataset requires dev, persistence, Kafka, and MSK Serverless."
    }

    precondition {
      condition     = !var.analytics_enabled || (length(var.analytics_pseudonym_salt) >= 24 && var.analytics_pseudonym_salt != "replace-before-enabling-analytics")
      error_message = "Set analytics_pseudonym_salt to a private value of at least 24 characters when analytics is enabled."
    }

    precondition {
      condition     = !var.deploy_full_stack || can(regex("^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$", var.budget_notification_email))
      error_message = "A valid budget_notification_email is required for the full demonstration stack."
    }
  }
}

resource "terraform_data" "lambda_build" {
  triggers_replace = [local.source_hash]

  provisioner "local-exec" {
    command = "${path.module}/scripts/build-lambda.sh '${local.source_root}' '${path.module}/.terraform/build/lambda' '${local.migration_root}'"
  }
}

data "archive_file" "lambda" {
  depends_on  = [terraform_data.lambda_build]
  type        = "zip"
  source_dir  = "${path.module}/.terraform/build/lambda"
  output_path = "${path.module}/.terraform/build/lambda.zip"
  excludes    = ["__pycache__", "*.pyc", ".pytest_cache"]
}

resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${local.name_prefix}-runtime"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-*:*"
      },
      {
        Sid      = "Tracing"
        Effect   = "Allow"
        Action   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
        Resource = "*"
      },
      {
        Sid    = "PersistenceSecrets"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = var.deploy_full_stack ? [
          aws_db_instance.this[0].master_user_secret[0].secret_arn,
          aws_secretsmanager_secret.keycloak_database[0].arn,
          aws_secretsmanager_secret.druid_database[0].arn,
        ] : (var.persistence_enabled ? [aws_db_instance.this[0].master_user_secret[0].secret_arn] : ["*"])
      },
      {
        Sid      = "DocumentStorage"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.documents.arn}/*"
      },
      {
        Sid      = "AnalyticsStorage"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = var.analytics_enabled ? [aws_s3_bucket.analytics[0].arn, "${aws_s3_bucket.analytics[0].arn}/*"] : [aws_s3_bucket.documents.arn]
      },
      {
        Sid    = "VpcNetworking"
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses",
        ]
        Resource = "*"
      },
      {
        Sid      = "KafkaDiscovery"
        Effect   = "Allow"
        Action   = ["kafka:GetBootstrapBrokers", "kafka:DescribeClusterV2"]
        Resource = "*"
      },
      {
        Sid    = "KafkaPublish"
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeCluster",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:CreateTopic",
          "kafka-cluster:AlterTopic",
          "kafka-cluster:DescribeGroup",
          "kafka-cluster:ReadData",
          "kafka-cluster:WriteData",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = local.functions
  name              = "/aws/lambda/${local.name_prefix}-${each.key}"
  retention_in_days = var.environment == "prod" ? 30 : 7
}

resource "aws_lambda_function" "this" {
  for_each = local.functions

  function_name    = "${local.name_prefix}-${each.key}"
  role             = aws_iam_role.lambda.arn
  handler          = each.value.handler
  runtime          = "python3.11"
  architectures    = ["x86_64"]
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout = each.key == "demo-seed" ? 120 : (
    contains(["kafka-bootstrap", "platform-bootstrap", "db-migrate", "outbox-publisher", "analytics-ingest"], each.key)
    ? 60 : var.lambda_timeout
  )
  memory_size = var.lambda_memory_size

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = merge({
      APP_ENV                      = var.environment
      TENANT_ID                    = "sistemas"
      FRONTEND_ORIGIN              = var.frontend_origin
      KEYCLOAK_ISSUER              = var.deploy_full_stack ? "https://${aws_cloudfront_distribution.keycloak[0].domain_name}/realms/academic-requests" : var.keycloak_issuer
      KEYCLOAK_AUDIENCE            = var.keycloak_audience
      KAFKA_ENABLED                = tostring(var.kafka_enabled)
      KAFKA_BOOTSTRAP_SERVERS      = local.effective_bootstrap_servers
      KAFKA_SECURITY_PROTOCOL      = local.effective_security_protocol
      KAFKA_SASL_MECHANISM         = local.effective_sasl_mechanism
      KAFKA_TOPIC_REQUESTS         = "academic-requests"
      KAFKA_TOPIC_REVIEWS          = "academic-reviews"
      KAFKA_TOPIC_NOTIFICATIONS    = "academic-notifications"
      PERSISTENCE_ENABLED          = tostring(var.persistence_enabled)
      DATABASE_HOST                = var.persistence_enabled ? aws_db_proxy.this[0].endpoint : "disabled"
      DATABASE_PORT                = "5432"
      DATABASE_NAME                = "academic_requests"
      DATABASE_SECRET_ARN          = var.persistence_enabled ? aws_db_instance.this[0].master_user_secret[0].secret_arn : ""
      DATABASE_SSLMODE             = "require"
      DOCUMENT_BUCKET              = aws_s3_bucket.documents.id
      ANALYTICS_BUCKET             = var.analytics_enabled ? aws_s3_bucket.analytics[0].id : "disabled"
      ANALYTICS_PSEUDONYM_SALT     = var.analytics_pseudonym_salt
      DRUID_SQL_URL                = var.deploy_full_stack && var.analytics_enabled ? "http://${aws_instance.druid[0].private_ip}:8888/druid/v2/sql" : "http://disabled"
      PLATFORM_DATABASE_HOST       = var.persistence_enabled ? aws_db_instance.this[0].address : "disabled"
      KEYCLOAK_DATABASE_SECRET_ARN = var.deploy_full_stack ? aws_secretsmanager_secret.keycloak_database[0].arn : "disabled"
      DRUID_DATABASE_SECRET_ARN    = var.deploy_full_stack ? aws_secretsmanager_secret.druid_database[0].arn : "disabled"
      }, contains(["auth-session", "authorizer"], each.key) ? {
      AUTH_CSRF_SECRET = var.deploy_full_stack ? random_password.auth_csrf[0].result : var.auth_csrf_secret
      } : {}, each.key == "auth-session" ? {
      KEYCLOAK_BFF_CLIENT_ID     = "academic-bff"
      KEYCLOAK_BFF_CLIENT_SECRET = var.deploy_full_stack ? random_password.keycloak_bff[0].result : var.keycloak_bff_client_secret
      AUTH_COOKIE_SECURE         = "true"
    } : {})
  }

  dynamic "vpc_config" {
    for_each = each.value.vpc ? [1] : []
    content {
      subnet_ids         = local.effective_subnet_ids
      security_group_ids = local.effective_security_group_ids
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda, aws_iam_role_policy.lambda]
}

resource "aws_apigatewayv2_api" "this" {
  name          = local.name_prefix
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type", "X-Request-Id", "Authorization", "X-CSRF-Token"]
    allow_methods = ["GET", "POST", "PATCH", "OPTIONS"]
    allow_origins = [var.frontend_origin]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
  }

  route_settings {
    route_key              = "POST /v1/auth/login"
    throttling_burst_limit = 5
    throttling_rate_limit  = 2
  }
}

resource "aws_apigatewayv2_authorizer" "keycloak" {
  api_id                            = aws_apigatewayv2_api.this.id
  name                              = "keycloak-academic-api"
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.this["authorizer"].invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  authorizer_result_ttl_in_seconds  = 0
}

resource "aws_apigatewayv2_integration" "lambda" {
  for_each = local.routes

  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.this[each.value.function_key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "this" {
  for_each = local.routes

  api_id             = aws_apigatewayv2_api.this.id
  route_key          = each.value.route_key
  target             = "integrations/${aws_apigatewayv2_integration.lambda[each.key].id}"
  authorization_type = each.value.authorization
  authorizer_id      = each.value.authorization == "CUSTOM" ? aws_apigatewayv2_authorizer.keycloak.id : null
}

resource "aws_lambda_permission" "api" {
  for_each = local.routes

  statement_id  = "AllowApiGateway-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this[each.value.function_key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowApiGatewayAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["authorizer"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/authorizers/*"
}

resource "aws_lambda_invocation" "database_migration" {
  count         = var.persistence_enabled ? 1 : 0
  function_name = aws_lambda_function.this["db-migrate"].function_name
  input         = jsonencode({ migration = "001_operational.sql" })
  triggers = {
    source_hash = local.source_hash
    database    = aws_db_instance.this[0].id
  }
  depends_on = [aws_db_proxy_target.this]
}

resource "aws_lambda_invocation" "kafka_bootstrap" {
  count         = var.create_msk_serverless ? 1 : 0
  function_name = aws_lambda_function.this["kafka-bootstrap"].function_name
  input         = jsonencode({ operation = "create-topics" })
  triggers = {
    cluster     = aws_msk_serverless_cluster.this[0].arn
    source_hash = local.source_hash
  }
  depends_on = [aws_msk_serverless_cluster.this]
}

resource "aws_lambda_invocation" "demo_seed" {
  count         = var.load_demo_dataset ? 1 : 0
  function_name = aws_lambda_function.this["demo-seed"].function_name
  input         = jsonencode({ dataset = "olap-demo-v1" })
  triggers = {
    database    = aws_db_instance.this[0].id
    source_hash = local.source_hash
  }
  depends_on = [aws_lambda_invocation.database_migration]
}
