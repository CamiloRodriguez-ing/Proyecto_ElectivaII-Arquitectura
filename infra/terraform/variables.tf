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

variable "use_kafka_vpc" {
  description = "Attach event-producing Lambdas to the supplied Kafka VPC networking."
  type        = bool
  default     = false
}

variable "kafka_subnet_ids" {
  description = "Private subnet IDs used by Lambda when use_kafka_vpc is true."
  type        = list(string)
  default     = []
}

variable "kafka_security_group_ids" {
  description = "Security group IDs used by Lambda when use_kafka_vpc is true."
  type        = list(string)
  default     = []
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
