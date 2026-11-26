resource "aws_vpc" "msk" {
  cidr_block           = var.kafka_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "${local.name_prefix}-application" }
}

resource "aws_subnet" "msk" {
  count                   = 2
  vpc_id                  = aws_vpc.msk.id
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  cidr_block              = cidrsubnet(var.kafka_vpc_cidr, 8, count.index + 1)
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name_prefix}-private-${count.index + 1}" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.msk.id
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  cidr_block              = cidrsubnet(var.kafka_vpc_cidr, 8, count.index + 101)
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name_prefix}-public-${count.index + 1}" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.msk.id
  tags   = { Name = local.name_prefix }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.msk.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  count      = var.deploy_full_stack ? 1 : 0
  domain     = "vpc"
  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count         = var.deploy_full_stack ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.msk.id
  tags   = { Name = "${local.name_prefix}-private" }
}

resource "aws_route" "private_internet" {
  count                  = var.deploy_full_stack ? 1 : 0
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.msk[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "lambda" {
  name        = "${local.name_prefix}-lambda"
  description = "Application Lambda network access"
  vpc_id      = aws_vpc.msk.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "msk" {
  name        = "${local.name_prefix}-kafka"
  description = "Lambda to MSK Serverless IAM traffic"
  vpc_id      = aws_vpc.msk.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "msk_from_lambda" {
  type                     = "ingress"
  description              = "IAM-authenticated Kafka from application Lambdas"
  from_port                = 9098
  to_port                  = 9098
  protocol                 = "tcp"
  security_group_id        = aws_security_group.msk.id
  source_security_group_id = aws_security_group.lambda.id
}

resource "aws_msk_serverless_cluster" "this" {
  count        = var.create_msk_serverless ? 1 : 0
  cluster_name = "${local.name_prefix}-events"
  client_authentication {
    sasl {
      iam {
        enabled = true
      }
    }
  }
  vpc_config {
    subnet_ids         = aws_subnet.msk[*].id
    security_group_ids = [aws_security_group.msk.id]
  }
}

data "aws_msk_bootstrap_brokers" "managed" {
  count       = var.create_msk_serverless ? 1 : 0
  cluster_arn = aws_msk_serverless_cluster.this[0].arn
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.msk.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]
}

resource "aws_security_group" "endpoints" {
  name   = "${local.name_prefix}-endpoints"
  vpc_id = aws_vpc.msk.id
  ingress {
    from_port       = 443
    to_port         = 443
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

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.msk.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.msk[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true
}
