# 📤 OUTPUTS

## outputs.tf

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "domain_name" {
  description = "Domain name for the application"
  value       = var.domain_name
}

output "region" {
  description = "AWS region"
  value       = var.region
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate_validation.main.certificate_arn
}