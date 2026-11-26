output "api_url" {
  description = "Base URL for the deployed HTTP API."
  value       = aws_apigatewayv2_api.this.api_endpoint
}

output "function_names" {
  value = { for name, function in aws_lambda_function.this : name => function.function_name }
}

output "msk_cluster_arn" {
  value = try(aws_msk_serverless_cluster.this[0].arn, null)
}

output "kafka_bootstrap_servers" {
  value     = local.effective_bootstrap_servers
  sensitive = true
}

output "database_proxy_endpoint" {
  value = try(aws_db_proxy.this[0].endpoint, null)
}

output "documents_bucket" {
  value = aws_s3_bucket.documents.id
}

output "analytics_bucket" {
  value = try(aws_s3_bucket.analytics[0].id, null)
}

output "frontend_url" {
  value = try("https://${aws_cloudfront_distribution.frontend[0].domain_name}", null)
}

output "keycloak_url" {
  value = try("https://${aws_cloudfront_distribution.keycloak[0].domain_name}", null)
}

output "keycloak_admin_secret_arn" {
  value = try(aws_secretsmanager_secret.keycloak_admin[0].arn, null)
}

output "druid_instance_id" {
  value = try(aws_instance.druid[0].id, null)
}

output "keycloak_instance_id" {
  value = try(aws_instance.keycloak[0].id, null)
}
