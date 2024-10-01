terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-west-1"
}

# Create VPC
resource "aws_vpc" "main_vpc" {
  cidr_block = "10.0.0.0/16"
}

# Create public subnet (for ECS instance)
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "PublicSubnet"
  }
}

# Create private subnet
resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main_vpc.id
  cidr_block = "10.0.2.0/24"

  tags = {
    Name = "PublicSubnet"
  }
}

# Security Group for Traefik
resource "aws_security_group" "traefik_sg" {
  name        = "traefik-sg"
  description = "Allow inbound traffic for Traefik"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "TraefikSecurityGroup"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "microservices_cluster"
}

# Create IAM policy for Traefik
resource "aws_iam_policy" "traefik_ecs_discovery_policy" {
  name        = "traefik-ecs-discovery-policy"
  description = "Policy for Traefik to discover ECS services"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TraefikECSReadAccess"
        Effect = "Allow"
        Action = [
          "ecs:ListClusters",
          "ecs:DescribeClusters",
          "ecs:ListTasks",
          "ecs:DescribeTasks",
          "ecs:DescribeContainerInstances",
          "ecs:DescribeTaskDefinition",
          "ec2:DescribeInstances",
          "ssm:DescribeInstanceInformation"
        ]
        Resource = "*"
      }
    ]
  })
}

# Create IAM Role
resource "aws_iam_role" "ecs_task_role" {
  name = "traefik-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach Traefik policy to IAM role
resource "aws_iam_role_policy_attachment" "traefik_ecs_discovery_policy_attachment" {
  policy_arn = aws_iam_policy.traefik_ecs_discovery_policy.arn
  role      = aws_iam_role.ecs_task_role.name
}

# Traefik Task Definition (like Compose.yaml)
resource "aws_ecs_task_definition" "traefik" {
  family                   = "traefik"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name  = "traefik"
      image = "traefik:v2.5"
      portMappings = [
        {
          containerPort = 80,
          hostPort      = 80,
        },
        {
          containerPort = 443,
          hostPort      = 443,
        },
      ],
      command = [
        "--api.insecure=true",
        "--providers.ecs=true"
      ]
    },
  ])

  # Assign IAM Role
  task_role_arn = aws_iam_role.ecs_task_role.arn
}

# ECS Service (actual instances of the task definition)
resource "aws_ecs_service" "traefik" {
  name            = "traefik"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.traefik.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.public.id]
    security_groups = [aws_security_group.traefik_sg.id]
  }
}


# resource "aws_ecs_task_definition" "user_service" {
#   family                   = "web-service"
#   requires_compatibilities = ["FARGATE"]
#   network_mode             = "awsvpc"
#   cpu                      = "256"
#   memory                   = "512"
# 
#   container_definitions = jsonencode([
#     {
#       name  = "web-service"
#       image = "your-web-service-image:latest"
#       portMappings = [
#         {
#           containerPort = 8080,
#           hostPort     = 8080,
#         },
#       ],
#        "labels": {
#          "traefik.enable": "true",
#          "traefik.http.routers.backend.rule": "rule",
#          "traefik.http.services.backend.loadbalancer.server.port": "80"
#        }
#     },
#   ])
# }

