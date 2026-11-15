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
