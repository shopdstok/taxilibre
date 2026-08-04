# AWS Secrets Manager configuration for application secrets

resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "taxilibre-${var.environment}-secrets"
  description = "Application secrets for TaxiLibre ${var.environment} environment"
  
  tags = {
    Environment = var.environment
    Application = "taxilibre"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DB_HOST     = aws_db_instance.main.address
    DB_NAME     = var.db_name
    DB_USER     = var.db_user
    DB_PASSWORD = random_password.db_password.result
    REDIS_HOST  = aws_elasticache_cluster.main.cache_nodes[0].address
    REDIS_PORT  = aws_elasticache_cluster.main.port
    REDIS_PASSWORD = random_password.redis_password.result
    JWT_SECRET  = random_password.jwt_secret.result
    STRIPE_SECRET_KEY = var.stripe_secret_key
    TWILIO_ACCOUNT_SID = var.twilio_account_sid
    TWILIO_AUTH_TOKEN = var.twilio_auth_token
    FIREBASE_SERVICE_ACCOUNT = var.firebase_service_account
  })
  
  # Force a new version whenever any of the values change
  force_overwrite = true
}

# Password resources for generating secure passwords
resource "random_password" "db_password" {
  length  = 16
  special = true
  override_special = "_%+"
}

resource "random_password" "redis_password" {
  length  = 16
  special = true
  override_special = "_%+"
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = true
  override_special = "_%+"
}

# Grant ECS task execution role permission to read secrets
data "aws_iam_policy_document" "ecs_secrets_access" {
  statement {
    sid    = "AllowSecretsRead"
    effect = "Allow"
    
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    
    resources = [
      aws_secretsmanager_secret.app_secrets.arn
    ]
  }
}

# Note: The actual IAM role policy attachment would be done in your ECS task definition
# or task execution role configuration
