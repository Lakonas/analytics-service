# ⚡ Analytics Service

A lightweight, self-hosted event analytics platform that collects and visualizes usage data from multiple applications through a single API endpoint. Think of it as a simplified, self-hosted alternative to [Mixpanel](https://mixpanel.com) or [PostHog](https://posthog.com) — designed for developers who want visibility into how their apps are being used without third-party dependencies.

**[Live Demo](https://analytics-service-production-37cd.up.railway.app)**

---

## The Problem

When you're running multiple applications, usage data is siloed inside each one. You can't easily answer questions like:

- Which of my apps is getting the most engagement?
- What are users actually doing across all my products?
- Are usage trends going up or down this week?

Third-party analytics tools solve this, but they come with cost, complexity, and data privacy tradeoffs. For small teams or solo developers managing a few apps, you just need something simple that answers those questions at a glance.

## The Solution

Analytics Service provides a single POST endpoint that any application can send events to. No SDK, no library, no shared database — just an HTTP request with a JSON payload. The service stores every event in PostgreSQL and renders a server-side dashboard that aggregates the data into actionable views.

The dashboard is fully dynamic. It discovers which applications are reporting, what event types exist, and how the data breaks down — all from querying the data itself. Connect a new app tomorrow and it appears on the dashboard automatically with its own filter button. No code changes required.

---

## Dashboard

The dashboard provides at-a-glance analytics across all connected applications:

- **Summary Cards** — Total events, events today, active sources, and the most frequent event type
- **Top Event Types** — Horizontal bar chart showing event frequency across all sources, scaled relative to the highest count
- **Recent Events** — Live feed of the 20 most recent events with source, type, and timestamp
- **Daily Volume** — Day-by-day breakdown of event counts per source for trend analysis
- **Source Filtering** — Dynamic filter buttons generated from the data, allowing you to view any single app's activity in isolation

---

## How It Works

### Architecture

```
┌──────────────┐     POST /api/events      ┌─────────────────────┐
│  PhotoLabs   │ ─────────────────────────► │                     │
└──────────────┘                            │  Analytics Service  │
                                            │                     │
┌──────────────┐     POST /api/events      │  ┌───────────────┐  │
│  ShortStop   │ ─────────────────────────► │  │  PostgreSQL   │  │
└──────────────┘                            │  │  Events Table │  │
                                            │  └───────────────┘  │
┌──────────────┐     POST /api/events      │                     │
│  Any App     │ ─────────────────────────► │  GET / → Dashboard  │
└──────────────┘                            └─────────────────────┘
```

Every event lands in a single `events` table with a generic schema. The service doesn't need to understand what a "photo" or a "link" is — it just stores the event name, the source app, a timestamp, and any metadata the source chooses to include.

### Data Model

```sql
CREATE TABLE events (
  id            SERIAL PRIMARY KEY,
  source        VARCHAR(255),          -- which app sent it
  event_type    VARCHAR(255),          -- what happened
  occurred_at   TIMESTAMP NOT NULL,    -- when it happened
  metadata      JSONB,                 -- flexible extra context
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The `metadata` column uses PostgreSQL's JSONB type, allowing each event to carry whatever context makes sense without schema changes. A `photo_liked` event might include `{"photo_id": 42}` while a `link_click` includes `{"short_code": "abc123", "referrer": "twitter.com"}`.

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/events` | Ingest an event from any application |
| `GET` | `/api/events` | Retrieve the 20 most recent events |
| `GET` | `/api/stats/summary` | Total events, today's count, active sources, top event |
| `GET` | `/api/stats/daily` | Event counts per day, grouped by source |
| `GET` | `/api/stats/top` | Most frequent event types with counts |
| `GET` | `/` | Server-rendered dashboard (EJS) |

---

## Integration Guide

Connecting an application to Analytics Service requires one HTTP POST request wherever you want to track an event. No SDK, no library — any app that can make an HTTP request can send events.

### Event Payload

```json
{
  "source": "your-app-name",
  "event_type": "what_happened",
  "occurred_at": "2026-02-17T10:30:00Z",
  "metadata": { "any": "extra context" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Your application's name (used for filtering and grouping) |
| `event_type` | string | Descriptive name for the event (use snake_case for consistency) |
| `occurred_at` | ISO 8601 | When the event happened in the source app |
| `metadata` | object | Optional JSON with any additional context |

### Example: Adding Tracking to an Express App

**Track user registration:**
```javascript
// In your registration route handler, after saving the user
app.post('/register', async (req, res) => {
  const user = await createUser(req.body);

  // Send event to Analytics Service
  axios.post('https://your-analytics-service.com/api/events', {
    source: 'your-app',
    event_type: 'user_registered',
    occurred_at: new Date().toISOString(),
    metadata: { username: user.username }
  });

  res.redirect('/dashboard');
});
```

**Track a button click or page interaction:**
```javascript
// In a route handler or middleware
axios.post('https://your-analytics-service.com/api/events', {
  source: 'your-app',
  event_type: 'photo_liked',
  occurred_at: new Date().toISOString(),
  metadata: { photo_id: req.params.id }
});
```

**Track from the frontend with fetch:**
```javascript
// In a React component or vanilla JS event handler
fetch('https://your-analytics-service.com/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'your-app',
    event_type: 'button_clicked',
    occurred_at: new Date().toISOString(),
    metadata: { button: 'signup-cta', page: '/landing' }
  })
});
```

### Testing with curl

```bash
curl -X POST https://your-analytics-service.com/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test-app",
    "event_type": "test_event",
    "occurred_at": "2026-02-17T12:00:00Z",
    "metadata": {"test": true}
  }'
```

### Event Naming Conventions

The analytics service stores whatever you send — it doesn't validate event names. For clean, useful dashboards, follow these conventions:

- Use `snake_case` for event types: `user_registered`, not `UserRegistered`
- Be specific: `photo_uploaded` is better than `upload`
- Be consistent: if one app uses `user_login`, don't use `user_signin` in another
- Keep source names short and lowercase: `photolabs`, `shortstop`

---

## Currently Connected Applications

The demo instance aggregates events from two deployed portfolio applications:

### PhotoLabs
A React/Express photo gallery with JWT authentication and AI-powered descriptions using Claude Vision API.

**Tracked events:** `user_registered`, `user_login`, `photo_viewed`, `photo_liked`, `photo_uploaded`, `ai_description_generated`, `topic_filtered`, `search_performed`

### ShortStop
An EJS/Express URL shortener with click analytics, QR code generation, and JWT authentication.

**Tracked events:** `user_registered`, `user_login`, `link_created`, `link_click`, `analytics_viewed`

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Server** | Node.js / Express | Lightweight, same ecosystem as source apps |
| **Database** | PostgreSQL | Relational queries (GROUP BY, COUNT, DISTINCT), JSONB for flexible metadata |
| **Templating** | EJS | Server-side rendering — appropriate for an internal dashboard, avoids frontend framework overhead |
| **Styling** | Vanilla CSS | Single stylesheet, no build step, dark theme |
| **Hosting** | Railway | Node + PostgreSQL in one project |

### Why EJS Instead of React?

This is an internal tool with a single dashboard page. The data refreshes on page load, not in real time. Server-side rendering keeps the architecture simple — no client-side state management, no build pipeline, no loading spinners. The API endpoints exist independently, so a React frontend (or any other client) could be built on top of the same backend without changes.

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/Lakonas/analytics-service.git
cd analytics-service

# Install dependencies
npm install

# Create the database
psql -d postgres -c "CREATE DATABASE analytics_service;"

# Run schema and seed data
psql analytics_service -f db/schema.sql
psql analytics_service -f db/seed.sql

# Create .env file
echo "DATABASE_URL=postgresql://labber:labber@localhost:5432/analytics_service" > .env
echo "PORT=8080" >> .env

# Start the server
npm start
```

Visit `http://localhost:8080` to view the dashboard.

---

## Challenges & Solutions

**Conditional SQL filtering without code duplication**
The dashboard supports filtering by source app, which means every query needs an optional WHERE clause. Rather than writing separate queries for filtered vs. unfiltered views, I built a reusable clause (`const whereClause = source ? 'WHERE source = $1' : ''`) that gets injected into every query. This keeps the code DRY and makes adding new filters straightforward.

**Designing for unknown data**
The service can't predict what events it will receive — that's the whole point. The schema uses generic strings instead of enums, and the dashboard discovers what exists by querying `SELECT DISTINCT` at render time. Filter buttons, event type lists, and source breakdowns are all generated from the data, not hardcoded. This means a new app can start sending events without any changes to the analytics service.

**Choosing server-side over client-side rendering**
For a dashboard that refreshes on page load, SSR with EJS eliminates an entire layer of complexity. No frontend build step, no client-side fetch calls, no loading states. The tradeoff is that you don't get real-time updates — but for an internal analytics tool, refresh-on-load is the right fit. The REST API still exists for any client that needs it.

---

## Future Enhancements

- **Date range filtering** — Allow users to select custom time windows (last 7 days, last 30 days, custom range)
- **Visual charts** — Replace the daily volume table with Chart.js bar or line charts
- **API key authentication** — Secure the POST endpoint so only authorized apps can send events
- **Webhook alerts** — Notify when event volume drops below a threshold (app health monitoring)
- **Real-time updates** — WebSocket integration for live event feed without page refresh
- **CSV/JSON export** — Download filtered data for external analysis
