resource "aws_vpc" "msk" {
  count = var.create_msk_serverless ? 1 : 0

  cidr_block           = var.kafka_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${local.name_prefix}-kafka" }
}

resource "aws_subnet" "msk" {
  count = var.create_msk_serverless ? 2 : 0

  vpc_id            = aws_vpc.msk[0].id
  availability_zone = data.aws_availability_zones.available.names[count.index]
  cidr_block        = cidrsubnet(var.kafka_vpc_cidr, 8, count.index + 1)

  tags = { Name = "${local.name_prefix}-kafka-${count.index + 1}" }
}

resource "aws_security_group" "msk" {
  count = var.create_msk_serverless ? 1 : 0

  name        = "${local.name_prefix}-kafka"
  description = "Lambda to MSK Serverless IAM traffic"
  vpc_id      = aws_vpc.msk[0].id

  egress {
    description = "Outbound traffic required by Lambda ENIs"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "msk_self" {
  count = var.create_msk_serverless ? 1 : 0

  type                     = "ingress"
  description              = "IAM-authenticated Kafka within the application security group"
  from_port                = 9098
  to_port                  = 9098
  protocol                 = "tcp"
  security_group_id        = aws_security_group.msk[0].id
  source_security_group_id = aws_security_group.msk[0].id
}

resource "aws_msk_serverless_cluster" "this" {
  count = var.create_msk_serverless ? 1 : 0

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
    security_group_ids = [aws_security_group.msk[0].id]
  }
}

data "aws_msk_bootstrap_brokers" "managed" {
  count = var.create_msk_serverless ? 1 : 0

  cluster_arn = aws_msk_serverless_cluster.this[0].arn
}
