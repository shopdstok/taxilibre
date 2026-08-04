'# CloudFront CDN Configuration for Global Content Delivery

# S3 bucket for static assets
resource "aws_s3_bucket" "assets" {
  bucket = "taxilibre-assets-${var.environment}"
  acl    = "public-read"

  versioning {
    enabled = true
  }

  # Static website hosting for SPA fallback
  website {
    index_document = "index.html"
    error_document = "index.html"
  }

  # CORS configuration for web assets
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
  }

  tags = {
    Environment = var.environment
    Purpose     = "static-assets"
  }
}

# CloudFront cache policy for optimized caching
resource "aws_cloudfront_cache_policy" "caching_optimized" {
  name         = "taxilibre-caching-optimized-${var.environment}"
  comment      = "Optimized caching policy for TaxiLibre static assets"
  default_ttl  = 86400    # 1 day
  max_ttl      = 31536000 # 1 year
  min_ttl      = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip = true
    enable_accept_encoding_brotli = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_strings_behavior = "none"
    }
  }
}

# CloudFront cache policy for API responses (shorter TTL)
resource "aws_cloudfront_cache_policy" "api_caching" {
  name         = "taxilibre-api-caching-${var.environment}"
  comment      = "Caching policy for API responses"
  default_ttl  = 60      # 1 minute
  max_ttl      = 300     # 5 minutes
  min_ttl      = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip = true
    enable_accept_encoding_brotli = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers = ["Authorization", "Content-Type", "Accept"]
    }
    query_strings_config {
      query_strings_behavior = "whitelist"
      query_strings = ["page", "limit", "sort", "filter"]
    }
  }
}

# CloudFront Origin Access Identity (OAI) for S3
resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {
  comment = "OAI for TaxiLibre S3 assets"
}

# S3 Bucket Policy to allow CloudFront OAI access
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.origin_access_identity.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# Main CloudFront Distribution for Global CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "TaxiLibre Global CDN - ${var.environment}"
  price_class         = "PriceClass_All"  # Global distribution
  default_root_object = "index.html"

  # Origins
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3Assets"
    s3_origin_config {
      origin_access_identity = "origin-access-identity-cloudfront/${aws_cloudfront_origin_access_identity.origin_access_identity.cloudfront_access_identity_path}"
    }
  }

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "APIBackend"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior - serve SPA from S3
  default_cache_behavior {
    target_origin_id = "S3Assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    cache_policy_id  = aws_cloudfront_cache_policy.caching_optimized.id
    compress         = true
  }

  # API cache behavior
  ordered_cache_behavior {
    path_pattern    = "/api/*"
    target_origin_id = "APIBackend"
    viewer_protocol_policy = "https-only"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id  = aws_cloudfront_cache_policy.api_caching.id
    compress         = true
  }

  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern    = "/assets/*"
    target_origin_id = "S3Assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    cache_policy_id  = aws_cloudfront_cache_policy.caching_optimized.id
    compress         = true
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code = 404
    response_code = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code = 403
    response_code = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  # Viewer certificate (would use ACM in production)
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Tags
  tags = {
    Environment = var.environment
    Service     = "CloudFront-CDN"
  }

  # Enable logging
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_name
    prefix          = "cdn-access-logs/"
  }

  depends_on = [
    aws_s3_bucket_policy.allow_cloudfront
  ]
}

# S3 bucket for CloudFront logs
resource "aws_s3_bucket" "logs" {
  bucket = "taxipore-cdn-logs-${var.environment}"
  acl    = "log-delivery-write"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "log-expiration"
    enabled = true
    expiration {
      days = 90
    }
  }

  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}
'
