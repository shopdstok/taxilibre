variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "taxilibre.com"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "taxilibre"
}

variable "db_user" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "twilio_account_sid" {
  description = "Twilio account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio auth token"
  type        = string
  sensitive   = true
}

variable "firebase_service_account" {
  description = "Firebase service account JSON"
  type        = string
  sensitive   = true
}
