# 🔐 AWS SECRETS CONFIGURATION

## secrets.tf

resource "aws_secretsmanager_secret" "database_url" {
  name = "taxilibre/database-url"
  description = "PostgreSQL connection string for TaxiLibre"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://admin:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}:5432/taxilibre"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name = "taxilibre/redis-url"
  description = "Redis connection string for TaxiLibre"
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = "redis://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "taxilibre/jwt-secret"
  description = "JWT secret key for authentication"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "stripe_secret" {
  name = "taxilibre/stripe-secret"
  description = "Stripe API secret key"
}

resource "aws_secretsmanager_secret_version" "stripe_secret" {
  secret_id = aws_secretsmanager_secret.stripe_secret.id
  secret_string = var.stripe_secret_key
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
}

/*=========================================================================
  SERVICE DISCOVERY (AWS CLOUD MAP)
=========================================================================*/

## service-discovery.tf

# Private DNS namespace for service discovery
resource "aws_servicediscovery_private_dns_namespace" "internal" {
  name        = "taxilibre.internal"
  description = "Internal service discovery namespace for TaxiLibre"
  vpc         = aws_vpc.main.id
}

# Backend service discovery
resource "aws_servicediscovery_service" "backend" {
  name = "backend"
  description = "Backend API service"

  dns_config {
    namespace_id = aws_servicediscovery_private_dns_namespace.internal.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "A"
      ttl  = 60
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Passenger web service discovery
resource "aws_servicediscovery_service" "passenger_web" {
  name = "passenger-web"
  description = "Passenger web application service"

  dns_config {
    namespace_id = aws_servicediscovery_private_dns_namespace.internal.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "A"
      ttl  = 60
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Driver web service discovery
resource "aws_servicediscovery_service" "driver_web" {
  name = "driver-web"
  description = "Driver web application service"

  dns_config {
    namespace_id = aws_servicediscovery_private_dns_namespace.internal.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "A"
      ttl  = 60
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Admin dashboard service discovery
resource "aws_servicediscovery_service" "admin_dashboard" {
  name = "admin-dashboard"
  description = "Admin dashboard application service"

  dns_config {
    namespace_id = aws_servicediscovery_private_dns_namespace.internal.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "A"
      ttl  = 60
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

/*=========================================================================
  ECS SERVICES
=========================================================================*/

## ecs-services.tf

# Backend Service
resource "aws_ecs_service" "backend" {
  name            = "taxilibre-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3003
  }

  service_registries {
    registry_arn = aws_servicediscovery_service.backend.arn
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "taxilibre-backend"
  }
}

# Frontend Services
resource "aws_ecs_service" "passenger_web" {
  name            = "taxilibre-passenger-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.passenger_web.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_servicediscovery_service.passenger_web.arn
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "taxilibre-passenger-web"
  }
}

resource "aws_ecs_service" "driver_web" {
  name            = "taxilibre-driver-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.driver_web.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_servicediscovery_service.driver_web.arn
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "taxilibre-driver-web"
  }
}

resource "aws_ecs_service" "admin_dashboard" {
  name            = "taxilibre-admin-dashboard"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin_dashboard.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_servicediscovery_service.admin_dashboard.arn
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "taxilibre-admin-dashboard"
  }
}

/*=========================================================================
  LOAD BALANCER
=========================================================================*/

## load-balancer.tf

# Target Groups
resource "aws_lb_target_group" "backend" {
  name     = "taxilibre-backend"
  port     = 3003
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "taxilibre-backend"
  }
}

resource "aws_lb_target_group" "frontend" {
  name     = "taxilibre-frontend"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "taxilibre-frontend"
  }
}

# HTTP Listener (Redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Listener Rules for path-based routing (attached to HTTPS listener)
resource "aws_lb_listener_rule" "driver_web" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  condition {
    path_pattern {
      values = ["/driver/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "admin_dashboard" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  condition {
    path_pattern {
      values = ["/admin/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 300

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}