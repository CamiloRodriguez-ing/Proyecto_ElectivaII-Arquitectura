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
    }
    authorizer = {
      handler = "functions.keycloak_authorizer.handler.lambda_handler"
    }
    validate-request = {
      handler = "functions.validate_request.handler.lambda_handler"
    }
    prepare-request = {
      handler = "functions.prepare_request.handler.lambda_handler"
    }
    evaluate-review = {
      handler = "functions.evaluate_review.handler.lambda_handler"
    }
    preview-notification = {
      handler = "functions.preview_notification.handler.lambda_handler"
    }
    analytics-summary = {
      handler = "functions.analytics_summary.handler.lambda_handler"
    }
  }

  routes = {
    health = {
      route_key     = "GET /v1/health"
      function_key  = "health"
      authorization = "NONE"
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
    analytics-summary = {
      route_key     = "POST /v1/analytics/summary"
      function_key  = "analytics-summary"
      authorization = "CUSTOM"
    }
  }

  source_root = abspath("${path.module}/../../src")
  source_hash = sha256(join("", concat(
    [for file in sort(fileset(local.source_root, "**")) : filesha256("${local.source_root}/${file}") if !endswith(file, ".pyc") && !strcontains(file, "__pycache__/")],
    [filesha256("${local.source_root}/requirements.txt")],
  )))

  managed_msk_subnet_ids         = var.create_msk_serverless ? aws_subnet.msk[*].id : []
  managed_msk_security_group_ids = var.create_msk_serverless ? [aws_security_group.msk[0].id] : []
  effective_subnet_ids           = var.create_msk_serverless ? local.managed_msk_subnet_ids : var.kafka_subnet_ids
  effective_security_group_ids   = var.create_msk_serverless ? local.managed_msk_security_group_ids : var.kafka_security_group_ids
  effective_use_kafka_vpc        = var.create_msk_serverless || var.use_kafka_vpc
  effective_bootstrap_servers = var.create_msk_serverless ? one(
    data.aws_msk_bootstrap_brokers.managed[*].bootstrap_brokers_sasl_iam
  ) : var.kafka_bootstrap_servers
  effective_security_protocol = var.create_msk_serverless ? "SASL_SSL" : var.kafka_security_protocol
  effective_sasl_mechanism    = var.create_msk_serverless ? "AWS_MSK_IAM" : var.kafka_sasl_mechanism
}

resource "terraform_data" "lambda_build" {
  triggers_replace = [local.source_hash]

  provisioner "local-exec" {
    command = "${path.module}/scripts/build-lambda.sh '${local.source_root}' '${path.module}/.terraform/build/lambda'"
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
        Sid    = "VpcNetworking"
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
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
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory_size

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      APP_ENV                   = var.environment
      FRONTEND_ORIGIN           = var.frontend_origin
      KEYCLOAK_ISSUER           = var.keycloak_issuer
      KEYCLOAK_AUDIENCE         = var.keycloak_audience
      KAFKA_ENABLED             = tostring(var.kafka_enabled)
      KAFKA_BOOTSTRAP_SERVERS   = local.effective_bootstrap_servers
      KAFKA_SECURITY_PROTOCOL   = local.effective_security_protocol
      KAFKA_SASL_MECHANISM      = local.effective_sasl_mechanism
      KAFKA_TOPIC_REQUESTS      = "academic-requests"
      KAFKA_TOPIC_REVIEWS       = "academic-reviews"
      KAFKA_TOPIC_NOTIFICATIONS = "academic-notifications"
      KAFKA_TOPIC_ANALYTICS     = "academic-analytics"
    }
  }

  dynamic "vpc_config" {
    for_each = local.effective_use_kafka_vpc && !contains(["health", "authorizer"], each.key) ? [1] : []
    content {
      subnet_ids         = local.effective_subnet_ids
      security_group_ids = local.effective_security_group_ids
    }
  }

  lifecycle {
    precondition {
      condition = !local.effective_use_kafka_vpc || (
        length(local.effective_subnet_ids) > 0 && length(local.effective_security_group_ids) > 0
      )
      error_message = "Kafka VPC attachment requires at least one subnet and one security group."
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda, aws_iam_role_policy.lambda]
}

resource "aws_apigatewayv2_api" "this" {
  name          = local.name_prefix
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type", "X-Request-Id", "Authorization"]
    allow_methods = ["GET", "POST", "OPTIONS"]
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
}

resource "aws_apigatewayv2_authorizer" "keycloak" {
  api_id                            = aws_apigatewayv2_api.this.id
  name                              = "keycloak-academic-api"
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.this["authorizer"].invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  identity_sources                  = ["$request.header.Authorization"]
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
