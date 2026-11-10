resource "grafana_contact_point" "contact_point_a630fca650c9503f" {
  name = "email"

  email {
    addresses    = ["seanprevity@gmail.com"]
    single_email = false
  }
}
