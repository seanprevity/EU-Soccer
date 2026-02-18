# European Football Stats App

A full-stack data and analytics platform for the top five European football leagues, designed to support historical analysis, match previews, and probabilistic outcome predictions. The project focuses on large-scale data ingestion, normalization, and analytics over long time horizons.

---

## Overview

This application aggregates and analyzes football data across **20+ seasons** for the top five European leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1). It provides structured access to teams, players, matches, standings, and odds while supporting analytical endeavors and predictive modeling.

---

## Key Features

* **Large-Scale Football Dataset**

  * 200+ teams
  * 3,000+ players
  * 35,000+ matches
  * 20+ years of historical league data

* **Automated Data Pipelines**

  * Periodic ingestion of data for recently played matches, upcoming matches and odds, and standings
  * PostgreSQL upsert and conflict-resolution logic to handle duplicate and evolving records

* **Predictive Analytics**

  * Monte Carlo simulation model for match outcome probabilities
  * Uses team form, historical performance, and contextual match data

* **Analytics & Insights**

  * Match previews and historical comparisons
  * Team and player performance trends

---

## Tech Stack

**Frontend**

* Next.js
* React

**Backend**

* Node.js
* Express.js

**Database**

* PostgreSQL (Supabase)

**Technologies**

* Redux
* Drizzle ORM
* Sonner Toast (Notifications)
* Multiple Football APIs and public CSV files
* Tailwind CSS v4.0

---

## Author

**Sean Previty**
MS Computer Science, University of Central Florida
GitHub: [https://github.com/seanprevity](https://github.com/seanprevity)
LinkedIn: [https://www.linkedin.com/in/sean-previty-64439b2b9/](https://www.linkedin.com/in/sean-previty-64439b2b9/)
