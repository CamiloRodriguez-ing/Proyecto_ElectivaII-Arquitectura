resource "aws_s3_bucket" "frontend" {
  count         = var.deploy_full_stack ? 1 : 0
  bucket_prefix = "${local.name_prefix}-frontend-"
  force_destroy = var.environment != "prod"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  count                   = var.deploy_full_stack ? 1 : 0
  bucket                  = aws_s3_bucket.frontend[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  count                             = var.deploy_full_stack ? 1 : 0
  name                              = "${local.name_prefix}-frontend"
  description                       = "Private S3 origin for the Angular SPA"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_cache_policy" "frontend" {
  count       = var.deploy_full_stack ? 1 : 0
  name        = "${local.name_prefix}-frontend"
  min_ttl     = 0
  default_ttl = 3600
  max_ttl     = 86400
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_cache_policy" "no_cache" {
  count       = var.deploy_full_stack ? 1 : 0
  name        = "${local.name_prefix}-no-cache"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_origin_request_policy" "frontend_api" {
  count = var.deploy_full_stack ? 1 : 0
  name  = "${local.name_prefix}-frontend-api"
  cookies_config { cookie_behavior = "all" }
  headers_config {
    header_behavior = "whitelist"
    headers { items = ["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-Id"] }
  }
  query_strings_config { query_string_behavior = "all" }
}

resource "aws_cloudfront_response_headers_policy" "frontend_security" {
  count = var.deploy_full_stack ? 1 : 0
  name  = "${local.name_prefix}-frontend-security"
  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      override                = true
    }
    content_type_options { override = true }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  count               = var.deploy_full_stack ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "${local.name_prefix} static Angular SPA"

  origin {
    domain_name              = aws_s3_bucket.frontend[0].bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[0].id
  }

  origin {
    domain_name = replace(aws_apigatewayv2_api.this.api_endpoint, "https://", "")
    origin_id   = "academic-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id           = "frontend-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.frontend[0].id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.frontend_security[0].id
  }

  ordered_cache_behavior {
    path_pattern               = "v1/*"
    target_origin_id           = "academic-api"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.no_cache[0].id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.frontend_api[0].id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.frontend_security[0].id
  }

  ordered_cache_behavior {
    path_pattern               = "runtime-config.json"
    target_origin_id           = "frontend-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.no_cache[0].id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.frontend_security[0].id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}

resource "aws_s3_bucket_policy" "frontend" {
  count  = var.deploy_full_stack ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "CloudFrontReadOnly"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend[0].arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.frontend[0].arn } }
    }]
  })
}

locals {
  frontend_source_hash = sha256(join("", [
    for file in sort(fileset("${path.module}/../../frontend", "**")) :
    filesha256("${path.module}/../../frontend/${file}")
    if !strcontains(file, "node_modules/") && !strcontains(file, "dist/")
  ]))
}

resource "terraform_data" "frontend_deploy" {
  count = var.deploy_full_stack ? 1 : 0
  triggers_replace = [
    local.frontend_source_hash,
    aws_cloudfront_distribution.frontend[0].id,
    aws_apigatewayv2_api.this.api_endpoint,
  ]
  provisioner "local-exec" {
    command = "${path.module}/scripts/deploy-frontend.sh '${path.module}/../../frontend' '${aws_s3_bucket.frontend[0].id}' '/v1' '${aws_cloudfront_distribution.frontend[0].id}'"
  }
  depends_on = [aws_s3_bucket_policy.frontend, terraform_data.keycloak_public_hostname]
}
