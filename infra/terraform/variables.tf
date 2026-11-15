variable "aws_region" {
  description = "AWS region used by the existing deployment."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used for AWS resource names."
  type        = string
  default     = "student-requests"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be dev, test, or prod."
  }
}

variable "frontend_origin" {
  description = "Exact browser origin allowed by CORS. Use * only for a development demo."
  type        = string
  default     = "*"
}

variable "keycloak_issuer" {
  description = "Exact Keycloak realm issuer used to validate access tokens."
  type        = string
  default     = "https://keycloak-3a73e53a-a0c9-4484-ba06-7bfbeca55673.moonshard-wow.com/realms/academic-requests"
}

variable "keycloak_audience" {
  description = "Required access-token audience."
  type        = string
  default     = "academic-api"
}

variable "kafka_enabled" {
  description = "Publish successful protected operations to Kafka."
  type        = bool
  default     = false
}

variable "kafka_bootstrap_servers" {
  description = "Comma-separated Kafka brokers. Ignored when create_msk_serverless is true."
  type        = string
  default     = "localhost:9092"
}

variable "kafka_security_protocol" {
  description = "Kafka client security protocol."
  type        = string
  default     = "SASL_SSL"

  validation {
    condition     = contains(["SASL_SSL", "SSL", "SASL_PLAINTEXT", "PLAINTEXT"], var.kafka_security_protocol)
    error_message = "Unsupported Kafka security protocol."
  }
}

variable "kafka_sasl_mechanism" {
  description = "Kafka SASL mechanism."
  type        = string
  default     = "AWS_MSK_IAM"

  validation {
    condition = contains(
      ["NONE", "AWS_MSK_IAM", "OAUTHBEARER", "PLAIN", "SCRAM-SHA-256", "SCRAM-SHA-512"],
      var.kafka_sasl_mechanism,
    )
    error_message = "Unsupported Kafka SASL mechanism."
  }
}

variable "create_msk_serverless" {
  description = "Create an isolated VPC and Amazon MSK Serverless cluster, and wire the Lambdas to it."
  type        = bool
  default     = false
}

variable "kafka_vpc_cidr" {
  description = "CIDR for the optional MSK Serverless VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "lambda_timeout" {
  type    = number
  default = 20
}

variable "lambda_memory_size" {
  type    = number
  default = 256
}

variable "persistence_enabled" {
  description = "Provision and use the PostgreSQL operational store."
  type        = bool
  default     = true
}

variable "database_instance_class" {
  description = "RDS PostgreSQL instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "analytics_enabled" {
  description = "Provision the S3/Glue/Redshift Serverless OLAP platform."
  type        = bool
  default     = false
}

variable "redshift_base_capacity" {
  description = "Base RPUs for the Redshift Serverless workgroup."
  type        = number
  default     = 8
}

variable "analytics_pseudonym_salt" {
  description = "Non-public salt used to pseudonymize analytics identities."
  type        = string
  sensitive   = true
  default     = "replace-before-enabling-analytics"
}
