data "aws_ssm_parameter" "al2023_x86" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_ssm_parameter" "al2023_arm" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "random_password" "keycloak_database" {
  count   = var.deploy_full_stack ? 1 : 0
  length  = 32
  special = false
}

resource "random_password" "druid_database" {
  count   = var.deploy_full_stack ? 1 : 0
  length  = 32
  special = false
}

resource "random_password" "keycloak_admin" {
  count   = var.deploy_full_stack ? 1 : 0
  length  = 24
  special = false
}

resource "random_password" "keycloak_bff" {
  count   = var.deploy_full_stack ? 1 : 0
  length  = 40
  special = false
}

resource "random_password" "auth_csrf" {
  count   = var.deploy_full_stack ? 1 : 0
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "keycloak_admin" {
  count                   = var.deploy_full_stack ? 1 : 0
  name_prefix             = "${local.name_prefix}-keycloak-admin-"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "keycloak_admin" {
  count         = var.deploy_full_stack ? 1 : 0
  secret_id     = aws_secretsmanager_secret.keycloak_admin[0].id
  secret_string = jsonencode({ username = "admin", password = random_password.keycloak_admin[0].result })
}

resource "aws_secretsmanager_secret" "keycloak_database" {
  count                   = var.deploy_full_stack ? 1 : 0
  name_prefix             = "${local.name_prefix}-keycloak-db-"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "keycloak_database" {
  count     = var.deploy_full_stack ? 1 : 0
  secret_id = aws_secretsmanager_secret.keycloak_database[0].id
  secret_string = jsonencode({
    username = "keycloak_app"
    password = random_password.keycloak_database[0].result
  })
}

resource "aws_secretsmanager_secret" "druid_database" {
  count                   = var.deploy_full_stack ? 1 : 0
  name_prefix             = "${local.name_prefix}-druid-db-"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "druid_database" {
  count     = var.deploy_full_stack ? 1 : 0
  secret_id = aws_secretsmanager_secret.druid_database[0].id
  secret_string = jsonencode({
    username = "druid_app"
    password = random_password.druid_database[0].result
  })
}

resource "aws_lambda_invocation" "platform_bootstrap" {
  count         = var.deploy_full_stack ? 1 : 0
  function_name = aws_lambda_function.this["platform-bootstrap"].function_name
  input         = jsonencode({ operation = "create-service-databases" })
  triggers = {
    database = aws_db_instance.this[0].id
    keycloak = aws_secretsmanager_secret_version.keycloak_database[0].version_id
    druid    = aws_secretsmanager_secret_version.druid_database[0].version_id
  }
  depends_on = [aws_db_instance.this]
}

resource "aws_iam_role" "platform_ec2" {
  count = var.deploy_full_stack ? 1 : 0
  name  = "${local.name_prefix}-platform-ec2"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "platform_ec2" {
  count = var.deploy_full_stack ? 1 : 0
  role  = aws_iam_role.platform_ec2[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.keycloak_database[0].arn,
          aws_secretsmanager_secret.druid_database[0].arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.analytics[0].arn, "${aws_s3_bucket.analytics[0].arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "kafka:GetBootstrapBrokers", "kafka:DescribeClusterV2",
          "kafka-cluster:Connect", "kafka-cluster:DescribeCluster",
          "kafka-cluster:DescribeTopic", "kafka-cluster:DescribeGroup",
          "kafka-cluster:ReadData"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "platform_ssm" {
  count      = var.deploy_full_stack ? 1 : 0
  role       = aws_iam_role.platform_ec2[0].name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "platform" {
  count = var.deploy_full_stack ? 1 : 0
  name  = "${local.name_prefix}-platform"
  role  = aws_iam_role.platform_ec2[0].name
}

resource "aws_security_group" "druid" {
  count       = var.deploy_full_stack && var.analytics_enabled ? 1 : 0
  name        = "${local.name_prefix}-druid"
  description = "Druid SQL from analytical Lambdas"
  vpc_id      = aws_vpc.msk.id
  ingress {
    from_port       = 8888
    to_port         = 8888
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "msk_from_druid" {
  count                    = var.deploy_full_stack && var.analytics_enabled ? 1 : 0
  type                     = "ingress"
  description              = "IAM-authenticated Kafka from Druid"
  from_port                = 9098
  to_port                  = 9098
  protocol                 = "tcp"
  security_group_id        = aws_security_group.msk.id
  source_security_group_id = aws_security_group.druid[0].id
}

resource "aws_security_group" "keycloak" {
  count       = var.deploy_full_stack ? 1 : 0
  name        = "${local.name_prefix}-keycloak"
  description = "Keycloak from its internal load balancer"
  vpc_id      = aws_vpc.msk.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "keycloak_alb" {
  count       = var.deploy_full_stack ? 1 : 0
  name        = "${local.name_prefix}-keycloak-alb"
  description = "CloudFront VPC origin to the Keycloak ALB"
  vpc_id      = aws_vpc.msk.id
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.kafka_vpc_cidr]
  }
  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.keycloak[0].id]
  }
}

resource "aws_security_group_rule" "keycloak_from_alb" {
  count                    = var.deploy_full_stack ? 1 : 0
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  security_group_id        = aws_security_group.keycloak[0].id
  source_security_group_id = aws_security_group.keycloak_alb[0].id
}

resource "aws_security_group_rule" "database_from_keycloak" {
  count                    = var.deploy_full_stack ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database[0].id
  source_security_group_id = aws_security_group.keycloak[0].id
}

resource "aws_security_group_rule" "database_from_druid" {
  count                    = var.deploy_full_stack && var.analytics_enabled ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database[0].id
  source_security_group_id = aws_security_group.druid[0].id
}

resource "aws_instance" "druid" {
  count                       = var.deploy_full_stack && var.analytics_enabled ? 1 : 0
  ami                         = data.aws_ssm_parameter.al2023_x86.value
  instance_type               = var.druid_instance_type
  subnet_id                   = aws_subnet.msk[0].id
  vpc_security_group_ids      = [aws_security_group.druid[0].id]
  iam_instance_profile        = aws_iam_instance_profile.platform[0].name
  associate_public_ip_address = false
  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/templates/druid-user-data.sh.tftpl", {
    region              = var.aws_region
    database_host       = aws_db_instance.this[0].address
    database_secret_arn = aws_secretsmanager_secret.druid_database[0].arn
    analytics_bucket    = aws_s3_bucket.analytics[0].id
    dockerfile_base64   = base64encode(file("${path.module}/../../analytics/druid/Dockerfile.aws"))
    supervisor_base64 = base64encode(templatefile("${path.module}/../../analytics/druid/supervisor-aws.json.tftpl", {
      bootstrap_servers = local.effective_bootstrap_servers
    }))
  })
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = true
    delete_on_termination = true
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }
  tags       = { Name = "${local.name_prefix}-druid" }
  depends_on = [aws_nat_gateway.this, aws_secretsmanager_secret_version.druid_database]
}

resource "aws_instance" "keycloak" {
  count                       = var.deploy_full_stack ? 1 : 0
  ami                         = data.aws_ssm_parameter.al2023_arm.value
  instance_type               = var.keycloak_instance_type
  subnet_id                   = aws_subnet.msk[0].id
  vpc_security_group_ids      = [aws_security_group.keycloak[0].id]
  iam_instance_profile        = aws_iam_instance_profile.platform[0].name
  associate_public_ip_address = false
  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/templates/keycloak-user-data.sh.tftpl", {
    region                  = var.aws_region
    database_host           = aws_db_instance.this[0].address
    database_secret_arn     = aws_secretsmanager_secret.keycloak_database[0].arn
    keycloak_admin_password = random_password.keycloak_admin[0].result
    keycloak_bff_secret     = random_password.keycloak_bff[0].result
  })
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 16
    encrypted             = true
    delete_on_termination = true
  }
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }
  tags       = { Name = "${local.name_prefix}-keycloak" }
  depends_on = [aws_nat_gateway.this, aws_secretsmanager_secret_version.keycloak_database]
}

resource "aws_lb" "keycloak" {
  count              = var.deploy_full_stack ? 1 : 0
  name               = substr("${local.name_prefix}-keycloak", 0, 32)
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.keycloak_alb[0].id]
  subnets            = aws_subnet.msk[*].id
}

resource "aws_lb_target_group" "keycloak" {
  count    = var.deploy_full_stack ? 1 : 0
  name     = substr("${local.name_prefix}-keycloak", 0, 32)
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.msk.id
  health_check {
    path                = "/realms/academic-requests"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200-399"
  }
}

resource "aws_lb_target_group_attachment" "keycloak" {
  count            = var.deploy_full_stack ? 1 : 0
  target_group_arn = aws_lb_target_group.keycloak[0].arn
  target_id        = aws_instance.keycloak[0].id
  port             = 8080
}

resource "aws_lb_listener" "keycloak" {
  count             = var.deploy_full_stack ? 1 : 0
  load_balancer_arn = aws_lb.keycloak[0].arn
  port              = 8080
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak[0].arn
  }
}

resource "aws_cloudfront_vpc_origin" "keycloak" {
  count = var.deploy_full_stack ? 1 : 0
  vpc_origin_endpoint_config {
    name                   = "${local.name_prefix}-keycloak"
    arn                    = aws_lb.keycloak[0].arn
    http_port              = 8080
    https_port             = 443
    origin_protocol_policy = "http-only"
    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }
  depends_on = [aws_lb_listener.keycloak]
}

resource "aws_cloudfront_origin_request_policy" "keycloak" {
  count = var.deploy_full_stack ? 1 : 0
  name  = "${local.name_prefix}-keycloak"
  cookies_config { cookie_behavior = "all" }
  headers_config { header_behavior = "allViewer" }
  query_strings_config { query_string_behavior = "all" }
}

resource "aws_cloudfront_distribution" "keycloak" {
  count           = var.deploy_full_stack ? 1 : 0
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_100"
  comment         = "${local.name_prefix} Keycloak HTTPS endpoint"

  origin {
    domain_name = aws_lb.keycloak[0].dns_name
    origin_id   = "keycloak-vpc"
    vpc_origin_config {
      vpc_origin_id            = aws_cloudfront_vpc_origin.keycloak[0].id
      origin_keepalive_timeout = 5
      origin_read_timeout      = 30
    }
  }

  default_cache_behavior {
    target_origin_id         = "keycloak-vpc"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = aws_cloudfront_cache_policy.no_cache[0].id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.keycloak[0].id
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}

resource "terraform_data" "keycloak_public_hostname" {
  count = var.deploy_full_stack ? 1 : 0
  triggers_replace = [
    aws_instance.keycloak[0].id,
    aws_cloudfront_distribution.keycloak[0].domain_name,
  ]
  provisioner "local-exec" {
    command = "bash '${path.module}/scripts/configure-keycloak-hostname.sh' '${aws_instance.keycloak[0].id}' '${var.aws_region}' 'https://${aws_cloudfront_distribution.keycloak[0].domain_name}'"
  }
  depends_on = [aws_cloudfront_distribution.keycloak, aws_lambda_invocation.platform_bootstrap]
}
