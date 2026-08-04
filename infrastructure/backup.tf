'# Automated backups for RDS instances

resource "aws_db_instance" "main" {
  # ... existing configuration
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  final_snapshot_identifier = "taxilibre-final-snapshot-${formatdate("YYYY-MM-DD", timestamp())}"
  skip_final_snapshot     = false
  deletion_protection     = true
}

# S3 bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket = "taxilibre-backups-${var.environment}"
  versioning {
    enabled = true
  }
  lifecycle {
    prevent_destroy = true
  }
  # Optional: lifecycle rules to expire old backups
  lifecycle_rule {
    id      = "expire-old-backups"
    enabled = true
    expiration {
      days = 30
    }
  }
}

# IAM role for Lambda backup function
resource "aws_iam_role" "backup_lambda" {
  name = "taxilibre-backup-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach policies for Lambda execution
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.backup_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_rds_access" {
  role       = aws_iam_role.backup_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_s3_access" {
  role       = aws_iam_role.backup_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# Lambda function for backups (would need actual deployment package)
resource "aws_lambda_function" "backup" {
  filename         = "backup-function.zip"
  function_name    = "taxilibre-backup-${var.environment}"
  role             = aws_iam_role.backup_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  timeout          = 300
  memory_size      = 512
  environment {
    variables = {
      DB_HOST   = aws_db_instance.main.address
      DB_NAME   = aws_db_instance.main.db_name
      S3_BUCKET = aws_s3_bucket.backups.bucket
    }
  }
}

# Schedule daily backups at 3 AM UTC
resource "aws_cloudwatch_event_rule" "daily_backup" {
  name                = "taxilibre-daily-backup-${var.environment}"
  schedule_expression = "cron(0 3 * * ? *)"
}

resource "aws_cloudwatch_event_target" "backup" {
  rule      = aws_cloudwatch_event_rule.daily_backup.name
  target_id = "run-backup"
  arn       = aws_lambda_function.backup.arn
}

# Permission for CloudWatch Events to invoke Lambda
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_backup.arn
}
'
