#!/bin/bash
cd /Users/shams/Desktop/taxilibre
git add infrastructure/variables.tf infrastructure/main.tf infrastructure/services.tf infrastructure/outputs.tf gateway-nginx/nginx.conf TASK_11_SUMMARY.md
git commit -m "feat(infra): configure HTTPS on ALB with ACM certificate

- Added domain_name and hosted_zone_id variables
- Created ACM certificate with DNS validation
- Configured HTTP to HTTPS redirect listener
- Configured HTTPS listener with ACM certificate
- Updated listener rules to use HTTPS listener
- Added outputs for ALB DNS, domain, region, and certificate ARN
- Updated Nginx configuration to support HTTPS"