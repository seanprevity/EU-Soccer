# The EPL folder: holds the dashboard and, in the next step, the alert rules
resource "grafana_folder" "epl" {
  uid   = "ftfgpg"
  title = "EPL"
}

# The production dashboard, from the JSON you exported
resource "grafana_dashboard" "epl_production" {
  folder      = grafana_folder.epl.uid
  config_json = file("${path.module}/dashboards/epl-production.json")
}
