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

  depends_on = [aws_lb_listener.main]

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

  depends_on = [aws_lb_listener.main]

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

  depends_on = [aws_lb_listener.main]

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

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "taxilibre-admin-dashboard"
  }
}

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

# Load Balancer Listener
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Listener Rules for path-based routing
resource "aws_lb_listener_rule" "driver_web" {
  listener_arn = aws_lb_listener.main.arn
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
  listener_arn = aws_lb_listener.main.arn
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
  listener_arn = aws_lb_listener.main.arn
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
