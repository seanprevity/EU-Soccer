resource "grafana_contact_point" "email" {
  name               = "email"
  disable_provenance = true

  email {
    addresses    = [var.alert_email]
    single_email = false
  }
}

resource "grafana_rule_group" "epl" {
  name               = "epl"
  folder_uid         = grafana_folder.epl.uid
  interval_seconds   = 60
  disable_provenance = true

  rule {
    name      = "Service down"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = "grafanacloud-prom"
      model          = "{\"editorMode\":\"code\",\"expr\":\"up{job=~\\\"epl-.*\\\"}\",\"instant\":true,\"intervalMs\":1000,\"legendFormat\":\"__auto\",\"maxDataPoints\":43200,\"range\":false,\"refId\":\"A\"}"
    }
    data {
      ref_id     = "C"
      query_type = "expression"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"
      model          = "{\"conditions\":[{\"evaluator\":{\"params\":[1],\"type\":\"lt\"},\"operator\":{\"type\":\"and\"},\"query\":{\"params\":[\"C\"]},\"reducer\":{\"params\":[],\"type\":\"last\"},\"type\":\"query\"}],\"datasource\":{\"type\":\"__expr__\",\"uid\":\"__expr__\"},\"expression\":\"A\",\"intervalMs\":1000,\"maxDataPoints\":43200,\"refId\":\"C\",\"type\":\"threshold\"}"
    }

    no_data_state  = "NoData"
    exec_err_state = "Error"
    for            = "5m"
    is_paused      = false

    notification_settings {
      contact_point = grafana_contact_point.email.name
    }
  }
  rule {
    name      = "Quick update overdue"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = "grafanacloud-prom"
      model          = "{\"editorMode\":\"code\",\"expr\":\"time() - update_last_success_timestamp_seconds{job=\\\"epl-update\\\", kind=\\\"quick\\\"}\",\"instant\":true,\"intervalMs\":1000,\"legendFormat\":\"__auto\",\"maxDataPoints\":43200,\"range\":false,\"refId\":\"A\"}"
    }
    data {
      ref_id     = "C"
      query_type = "expression"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"
      model          = "{\"conditions\":[{\"evaluator\":{\"params\":[14400],\"type\":\"gt\"},\"operator\":{\"type\":\"and\"},\"query\":{\"params\":[\"C\"]},\"reducer\":{\"params\":[],\"type\":\"last\"},\"type\":\"query\"}],\"datasource\":{\"type\":\"__expr__\",\"uid\":\"__expr__\"},\"expression\":\"A\",\"intervalMs\":1000,\"maxDataPoints\":43200,\"refId\":\"C\",\"type\":\"threshold\"}"
    }

    no_data_state  = "NoData"
    exec_err_state = "Error"
    is_paused      = false

    notification_settings {
      contact_point = grafana_contact_point.email.name
    }
  }
  rule {
    name      = "Live worker stalled"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = "grafanacloud-prom"
      model          = "{\"editorMode\":\"code\",\"expr\":\"time() - live_last_tick_timestamp_seconds{job=\\\"epl-live\\\"}\",\"instant\":true,\"intervalMs\":1000,\"legendFormat\":\"__auto\",\"maxDataPoints\":43200,\"range\":false,\"refId\":\"A\"}"
    }
    data {
      ref_id     = "C"
      query_type = "expression"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"
      model          = "{\"conditions\":[{\"evaluator\":{\"params\":[7200],\"type\":\"gt\"},\"operator\":{\"type\":\"and\"},\"query\":{\"params\":[\"C\"]},\"reducer\":{\"params\":[],\"type\":\"last\"},\"type\":\"query\"}],\"datasource\":{\"type\":\"__expr__\",\"uid\":\"__expr__\"},\"expression\":\"A\",\"intervalMs\":1000,\"maxDataPoints\":43200,\"refId\":\"C\",\"type\":\"threshold\"}"
    }

    no_data_state  = "NoData"
    exec_err_state = "Error"
    is_paused      = false

    notification_settings {
      contact_point = grafana_contact_point.email.name
    }
  }
  rule {
    name      = "API error rate high"
    condition = "C"

    data {
      ref_id = "A"

      relative_time_range {
        from = 600
        to   = 0
      }

      datasource_uid = "grafanacloud-prom"
      model          = "{\"editorMode\":\"code\",\"expr\":\"100 * (sum(rate(http_request_duration_seconds_count{status_code=~\\\"5..|aborted\\\"}[10m])) or vector(0)) / clamp_min(sum(rate(http_request_duration_seconds_count[10m])), 1e-9)\",\"instant\":true,\"intervalMs\":1000,\"legendFormat\":\"__auto\",\"maxDataPoints\":43200,\"range\":false,\"refId\":\"A\"}"
    }
    data {
      ref_id     = "C"
      query_type = "expression"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"
      model          = "{\"conditions\":[{\"evaluator\":{\"params\":[5],\"type\":\"gt\"},\"operator\":{\"type\":\"and\"},\"query\":{\"params\":[\"C\"]},\"reducer\":{\"params\":[],\"type\":\"last\"},\"type\":\"query\"}],\"datasource\":{\"type\":\"__expr__\",\"uid\":\"__expr__\"},\"expression\":\"A\",\"intervalMs\":1000,\"maxDataPoints\":43200,\"refId\":\"C\",\"type\":\"threshold\"}"
    }

    no_data_state  = "NoData"
    exec_err_state = "Error"
    for            = "10m"
    is_paused      = false

    notification_settings {
      contact_point = grafana_contact_point.email.name
    }
  }
}
