# European Football Stats

**Live site:** [eu-soccer-delta.vercel.app](https://eu-soccer-delta.vercel.app/)

A full-stack data and analytics platform for the top five European football leagues: live
scores, match stats and lineups, historical analysis, head-to-head comparisons, and
probabilistic match predictions. The project focuses on reliable data ingestion from several
sources, a normalized database covering 20+ seasons, and running the backend like a
production service, with metrics, tracing, and alerting.

---

## Overview

The app covers **20+ seasons** of the Premier League, La Liga, Serie A, Bundesliga, and
Ligue 1. A Next.js frontend talks to an Express API on AWS, and two background workers keep
the data current: one follows live matches, the other imports results, standings, fixtures,
odds, squads, and player images on a schedule.

---

## Key Features

- **Live matches**
  - Live scores, goal and card timelines, substitutions, lineups, and match stats (including xG)
  - Confirmed starting XIs as soon as they're published before kickoff

- **Large historical dataset**
  - 200+ teams, 3,000+ players, 35,000+ matches over 20+ seasons
  - Standings (home, away, and total) with recent form

- **Match history and comparisons**
  - Team match history with filters (season, venue, opponent, result, scoreline, goals)
  - Head-to-head records, team stat comparisons, and top-player leaderboards

- **Automated data pipelines**
  - Multi-source ETL from ESPN, football-data.org, The Odds API, and TheSportsDB,
    plus historical CSV data
  - Idempotent PostgreSQL upserts, data-quality checks on imported match timelines,
    and rate-limit handling for external APIs

---

## Architecture

```mermaid
flowchart LR
  USER[Browser] --> WEB[Next.js app<br/>Vercel]
  WEB --> GW[AWS API Gateway]
  GW --> API[Express API<br/>EC2]
  subgraph EC2
    API
    LIVE[Live worker]
    UPD[Update worker]
  end
  API --> DB[(PostgreSQL<br/>Supabase)]
  LIVE --> DB
  UPD --> DB
  LIVE --> ESPN[ESPN]
  UPD --> ESPN
  UPD --> FD[football-data.org]
  UPD --> ODDS[The Odds API]
  UPD --> SDB[TheSportsDB]
```

- **Live worker:** polls ESPN every 30 seconds while matches are in play, and stores scores,
  events, lineups, and stats.
- **Update worker:** runs a quick update every few hours (results, standings, upcoming
  fixtures) and a full daily update (odds, squads, top players, player images).
- All three services run under systemd as a dedicated non-root user.

---

## Observability

The API and both workers are fully instrumented. Grafana Alloy on the instance collects
metrics, logs, and traces and ships them to Grafana Cloud. Dashboards and alert rules are
managed as code with Terraform.

```mermaid
flowchart LR
  subgraph EC2
    API[epl-api]
    LIVE[epl-live worker]
    UPD[epl-update worker]
    ALLOY[Grafana Alloy]
  end
  API -- "/metrics" --> ALLOY
  LIVE -- "/metrics" --> ALLOY
  UPD -- "/metrics" --> ALLOY
  API -- "OTLP traces" --> ALLOY
  LIVE -- "OTLP traces" --> ALLOY
  UPD -- "OTLP traces" --> ALLOY
  ALLOY -- "journald logs" --> LOKI[(Loki)]
  ALLOY --> PROM[(Prometheus)]
  ALLOY --> TEMPO[(Tempo)]
  PROM & LOKI & TEMPO --> GRAFANA[Grafana dashboards + alerts]
  TF[Terraform / HCP Terraform] --> GRAFANA
```

| Signal                                | What's collected                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Metrics** (Prometheus)              | Request latency by route, ESPN request outcomes, live-worker tick duration, update-run duration and failures, Node.js runtime metrics |
| **Logs** (Loki)                       | journald output from all three services                                                                                               |
| **Traces** (Tempo, via OpenTelemetry) | Every API request and worker run, with hand-written spans for each service function and database query                                |
| **Alerts**                            | Service down, live worker stalled, quick update overdue, API error rate above 5%                                                      |

Latency panels use **exemplars**: each dot on the chart is a real request, and clicking it
opens that request's trace.

![Service overview](docs/images/overview.png)
![Production dashboard](docs/images/dashboard.png)
![Exemplar linking a latency point to its trace](docs/images/exemplar.png)

### Infrastructure as code

The Grafana folder, dashboard, alert rules, and contact point live in
[`infra/grafana`](infra/grafana) and are applied through HCP Terraform. Every pull request
touching that folder runs `terraform fmt`, `validate`, and `plan` in GitHub Actions.

### Load test

A [k6](load-test/api.js) script ramps to 20 concurrent users across the home and team pages:
**p95 74 ms, 0% errors** over 2,800 requests.

---

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Redux Toolkit (RTK Query), Tailwind CSS v4, Sonner

**Backend:** Node.js, Express, TypeScript, Zod, Drizzle ORM

**Database:** PostgreSQL (Supabase)

**Infrastructure:** AWS (EC2, API Gateway, VPC), Vercel, systemd

**Observability:** OpenTelemetry, Prometheus, Grafana Cloud (Loki, Tempo), Grafana Alloy, k6

**Tooling:** pnpm workspaces (shared types between client and server), Terraform / HCP Terraform,
GitHub Actions, Dependabot, ESLint

**Data sources:** ESPN, football-data.org, The Odds API, TheSportsDB, historical CSV files

---

## Project Structure

```text
client/          Next.js frontend
server/          Express API, live and update workers, database schema (Drizzle)
shared/          Types shared by the client and server (@epl/shared)
infra/grafana/   Terraform for the Grafana dashboard, alerts, and contact point
load-test/       k6 load test
docs/images/     README screenshots
```

---

## Author

**Sean Previty**
M.S. Computer Science, University of Central Florida
GitHub: [https://github.com/seanprevity](https://github.com/seanprevity)
LinkedIn: [https://www.linkedin.com/in/sean-previty-64439b2b9/](https://www.linkedin.com/in/sean-previty-64439b2b9/)
