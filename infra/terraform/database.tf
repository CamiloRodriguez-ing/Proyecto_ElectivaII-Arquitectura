resource "aws_security_group" "database" {
  count       = var.persistence_enabled ? 1 : 0
  name        = "${local.name_prefix}-postgres"
  description = "PostgreSQL access through RDS Proxy"
  vpc_id      = aws_vpc.msk.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }
}

resource "aws_security_group_rule" "database_self" {
  count                    = var.persistence_enabled ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database[0].id
  source_security_group_id = aws_security_group.database[0].id
}

resource "aws_db_subnet_group" "this" {
  count      = var.persistence_enabled ? 1 : 0
  name       = "${local.name_prefix}-postgres"
  subnet_ids = aws_subnet.msk[*].id
}

resource "aws_db_instance" "this" {
  count                       = var.persistence_enabled ? 1 : 0
  identifier                  = "${local.name_prefix}-postgres"
  engine                      = "postgres"
  engine_version              = "16.6"
  instance_class              = var.database_instance_class
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = "academic_requests"
  username                    = "academic_admin"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.this[0].name
  vpc_security_group_ids      = [aws_security_group.database[0].id]
  backup_retention_period     = var.environment == "prod" ? 14 : 1
  deletion_protection         = var.environment == "prod"
  skip_final_snapshot         = var.environment != "prod"
  final_snapshot_identifier   = var.environment == "prod" ? "${local.name_prefix}-final" : null
  publicly_accessible         = false
  auto_minor_version_upgrade  = true
  apply_immediately           = var.environment != "prod"
}

resource "aws_iam_role" "rds_proxy" {
  count = var.persistence_enabled ? 1 : 0
  name  = "${local.name_prefix}-rds-proxy"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "rds.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "rds_proxy" {
  count = var.persistence_enabled ? 1 : 0
  role  = aws_iam_role.rds_proxy[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
      Resource = aws_db_instance.this[0].master_user_secret[0].secret_arn
    }]
  })
}

resource "aws_db_proxy" "this" {
  count                  = var.persistence_enabled ? 1 : 0
  name                   = "${local.name_prefix}-postgres"
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy[0].arn
  vpc_subnet_ids         = aws_subnet.msk[*].id
  vpc_security_group_ids = [aws_security_group.database[0].id]
  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_db_instance.this[0].master_user_secret[0].secret_arn
  }
}

resource "aws_db_proxy_default_target_group" "this" {
  count         = var.persistence_enabled ? 1 : 0
  db_proxy_name = aws_db_proxy.this[0].name
  connection_pool_config {
    max_connections_percent      = 80
    max_idle_connections_percent = 40
  }
}

resource "aws_db_proxy_target" "this" {
  count                  = var.persistence_enabled ? 1 : 0
  db_instance_identifier = aws_db_instance.this[0].identifier
  db_proxy_name          = aws_db_proxy.this[0].name
  target_group_name      = aws_db_proxy_default_target_group.this[0].name
}
