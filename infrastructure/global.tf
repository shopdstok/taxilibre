provider "aws" {
  alias = "eu_west"
  region = "eu-west-1"
}

provider "aws" {
  alias = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias = "ap_southeast"
  region = "ap-southeast-1"
}

resource "aws_db_instance" "read_replica_eu" {
  provider         = aws.eu_west
  identifier       = "taxilibre-replica-eu"
  replicate_source_db = aws_db_instance.main.id
  instance_class   = "db.t3.large"
  availability_zone = "eu-west-1a"
  backup_retention_period = 0
}

resource "aws_db_instance" "read_replica_us" {
  provider         = aws.us_east
  identifier       = "taxilibre-replica-us"
  replicate_source_db = aws_db_instance.main.id
  instance_class   = "db.t3.large"
  availability_zone = "us-east-1a"
  backup_retention_period = 0
}

resource "aws_db_instance" "read_replica_ap" {
  provider         = aws.ap_southeast
  identifier       = "taxilibre-replica-ap"
  replicate_source_db = aws_db_instance.main.id
  instance_class   = "db.t3.large"
  availability_zone = "ap-southeast-1a"
  backup_retention_period = 0
}
