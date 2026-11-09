terraform {
  required_version = ">= 1.11"

  cloud {
    organization = "seanprevity"

    workspaces {
      name = "epl-grafana"
    }
  }

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.0"
    }
  }
}

provider "grafana" {}