# NorthPark_Planner Agent Instructions

## 1. Project Context

This project is **NorthPark_Planner**, an intelligent travel planning and recommendation web application for Northern Thailand National Parks.

The system helps users:

* browse national parks in Northern Thailand
* search and filter parks
* view park details
* create trip plans
* evaluate trip suitability
* view trip history
* receive basic recommendations for safer travel planning

The long-term vision includes LINE Login, LINE Messaging API, LINE Rich Menu, n8n workflow automation, Weather API, Distance or Maps API, AI Chatbot, Admin Dashboard, Knowledge Base, and notification features.

However, the current development scope is **Phase 1 MVP only**.

---

## 2. Current Phase: Phase 1 MVP

The current scope is **Phase 1 only**.

Phase 1 focuses on:

* Core web application
* Mobile-first user interface
* National park browsing
* Trip planning
* Trip evaluation result
* Future-ready database design
* Rule-based Travel Suitability Score using mock or manual data

Default to Phase 1 unless the user explicitly says otherwise.

Do not implement Phase 2 or Phase 3 features unless explicitly requested.

---

## 3. Phase 1 Features

Implement only these features in Phase 1.

### User Web Features

1. Home / Landing page
2. Park list page
3. Park detail page
4. Search and filter parks
5. Trip planner form
6. My Trips page
7. Edit trip
8. Delete or cancel trip
9. Trip evaluation result page
10. Rule-based Travel Suitability Score
11. Factor breakdown for trip evaluation
12. Basic recommendations for improving trip plans
13. Mobile-first responsive UI

### Data Features

1. PostgreSQL database
2. Prisma schema
3. Seed data for parks
4. Seed or mock user data
5. Trip data storage
6. Trip evaluation history
7. Basic system settings or evaluation rules

---

## 4. Out of Scope for Phase 1

Do not implement these features in Phase 1:

* LINE Login
* LINE Messaging API
* LINE Rich Menu
* LINE notifications
* n8n workflow automation
* Weather API integration
* Google Maps API integration
* Distance API integration
* AI Chatbot
* AI Agent
* Knowledge Base management
* Conversation history
* Full Admin Dashboard
* Real external API calls
* Push notifications
* Production authentication flow

External data such as weather, distance, arrival time, and sunset time may be represented using mock fields or manual inputs in Phase 1.

Database design may prepare for future phases, but implementation must stay focused on Phase 1.

---

## 5. Tech Stack

Use the following stack:

* Next.js App Router
* TypeScript
* Tailwind CSS
* PostgreSQL
* Prisma
* Docker for local PostgreSQL
* React components
* Server Actions or API Routes when appropriate

Do not change the stack unless explicitly requested.

---

## 6. Recommended Phase 1 Routes

Suggested frontend routes:

* `/`
* `/parks`
* `/parks/[id]`
* `/trips`
* `/trips/new`
* `/trips/[id]`
* `/trips/[id]/edit`
* `/trips/[id]/result`

Suggested API routes if needed:

* `/api/parks`
* `/api/trips`
* `/api/trips/[id]`
* `/api/evaluations`

Keep the route structure simple, readable, and easy to explain in a thesis/demo presentation.

---

## 7. Phase 1 Codex Skills

When working on Phase 1, use these skills when relevant:

* `$frontend-patterns`
* `$liquid-glass-design`
* `$api-design`
* `$backend-patterns`
* `$postgres-patterns`
* `$prisma-patterns`
* `$database-migrations`
* `$docker-patterns`
* `$tdd-workflow`
* `$verification-loop`
* `$security-review`

Use only Phase 1 skills by default.

Do not use LINE, n8n, AI chatbot, notification, or knowledge-base related skills in Phase 1.

---

## 8. UI/UX Direction

Design the interface as mobile-first.

Preferred UI style:

* Clean iOS-like interface
* Soft card layout
* Rounded corners
* Clear typography
* Good spacing
* Calm travel and safety feeling
* Easy-to-use forms
* Clear score display
* Clear recommendations
* Tailwind CSS only

Avoid:

* Overly complex animation
* Too many colors
* Desktop-first layout
* Cluttered dashboards
* Unreadable small text
* Heavy visual effects that reduce usability

For Phase 1, prioritize clarity, usability, and mobile experience over complex visual effects.

---

## 9. Database Design Rules

Design the database for long-term scalability, but implement only what is needed for Phase 1.

Use PostgreSQL with Prisma.

Core principles:

* Keep the schema normalized.
* Do not put unrelated data into one large table.
* Separate master data, transaction data, evaluation results, and system configuration.
* Use clear relations and foreign keys.
* Use enums for statuses and fixed types.
* Add `createdAt` and `updatedAt` to important tables.
* Keep evaluation history instead of overwriting old results.
* Design with future LINE, n8n, Weather API, Distance API, AI Chatbot, and Admin Dashboard features in mind.
* Do not store secrets or API keys in the database.
* Do not expose another user’s trip data.
* Keep the schema easy to explain in a thesis/demo.

Suggested Phase 1 models:

* `User`
* `Park`
* `ParkAttraction`
* `ParkWarning`
* `Trip`
* `TripEvaluation`
* `EvaluationRule`
* `SystemSetting`

Models that may be added in later phases:

* `NotificationLog`
* `WeatherSnapshot`
* `RouteSnapshot`
* `KnowledgeBaseItem`
* `ConversationLog`

Do not implement later-phase models unless explicitly requested.

---

## 10. Suggested Prisma Model Responsibilities

### User

Represents a user of the system.

In Phase 1, this may be a mock user or simple local user record.

Design it to support future LINE Login.

Suggested fields:

* `id`
* `lineUserId` optional for future LINE integration
* `displayName`
* `email`
* `phone`
* `role`
* `createdAt`
* `updatedAt`

Suggested roles:

* `USER`
* `ADMIN`

Admin UI is not required in Phase 1, but the role field can prepare for future authorization.

---

### Park

Represents a national park.

Suggested fields:

* `id`
* `nameTh`
* `nameEn`
* `province`
* `region`
* `latitude`
* `longitude`
* `openTime`
* `closeTime`
* `description`
* `coverImageUrl`
* `isActive`
* `createdAt`
* `updatedAt`

A park should be able to have many attractions, warnings, and trips.

---

### ParkAttraction

Represents attractions inside a park.

Suggested fields:

* `id`
* `parkId`
* `name`
* `description`
* `type`
* `imageUrl`
* `createdAt`
* `updatedAt`

Example attraction types:

* `VIEWPOINT`
* `WATERFALL`
* `TRAIL`
* `CAMPSITE`
* `OTHER`

---

### ParkWarning

Represents warnings, travel cautions, or safety notes for a park.

Suggested fields:

* `id`
* `parkId`
* `title`
* `description`
* `severity`
* `isActive`
* `createdAt`
* `updatedAt`

Suggested warning severity:

* `LOW`
* `MEDIUM`
* `HIGH`

---

### Trip

Represents a user-created travel plan.

Suggested fields:

* `id`
* `userId`
* `parkId`
* `tripDate`
* `departAt`
* `originText`
* `originLat` optional
* `originLng` optional
* `transportMode`
* `travelerCount`
* `status`
* `createdAt`
* `updatedAt`

Suggested transport modes:

* `CAR`
* `MOTORCYCLE`
* `PUBLIC_TRANSPORT`
* `OTHER`

Suggested trip statuses for Phase 1:

* `DRAFT`
* `EVALUATED`
* `CANCELLED`
* `COMPLETED`

Do not add monitoring or notification statuses in Phase 1 unless explicitly requested.

---

### TripEvaluation

Represents a calculated evaluation result for a trip.

Do not only store the final score. Store factor scores, explanation, recommendation, and timestamp.

Suggested fields:

* `id`
* `tripId`
* `totalScore`
* `level`
* `weatherScore`
* `durationScore`
* `timeScore`
* `userProfileScore`
* `summary`
* `recommendation`
* `evaluatedAt`
* `createdAt`

Suggested levels:

* `EXCELLENT`
* `GOOD`
* `MODERATE`
* `NEEDS_ADJUSTMENT`

A trip may have many evaluations because the system should preserve evaluation history.

---

### EvaluationRule

Represents configurable scoring rules or weights.

Suggested fields:

* `id`
* `key`
* `value`
* `description`
* `isActive`
* `createdAt`
* `updatedAt`

Example keys:

* `weather_weight`
* `duration_weight`
* `time_weight`
* `user_profile_weight`

In Phase 1, hardcoded constants are acceptable if they are kept in one place. If EvaluationRule is implemented, keep it simple.

---

### SystemSetting

Represents general configuration for the system.

Suggested fields:

* `id`
* `key`
* `value`
* `description`
* `createdAt`
* `updatedAt`

Do not overbuild settings in Phase 1.

---

## 11. Trip Evaluation Logic

Use an explainable rule-based scoring model.

Factors:

* Weather Condition: 0.35
* Travel Duration: 0.25
* Time Suitability: 0.20
* User Profile: 0.20

Formula:

```txt
S = (0.35 * W) + (0.25 * D) + (0.20 * T) + (0.20 * U)
```

Where:

* `W` = weather condition score
* `D` = travel duration score
* `T` = time suitability score
* `U` = user profile score

For Phase 1, these values may come from manual form inputs, mock data, or placeholder calculation logic.

Convert the final score to 0–100 for display.

Suggested display levels:

* 80–100: เหมาะสมมาก
* 60–79: เหมาะสม
* 40–59: ปานกลาง
* 0–39: ควรปรับแผน

The result page should show:

* Final score
* Suitability level
* Factor breakdown
* Explanation
* Recommendations

---

## 12. Phase 1 Scoring Assumptions

Because Phase 1 does not use real Weather API or Maps API, use mock/manual values.

Allowed Phase 1 inputs:

* Weather condition selected by user or mock data
* Estimated travel duration entered manually
* Departure time entered by user
* Mock sunset time
* Traveler count
* Transport mode

Do not call external APIs in Phase 1.

Keep the scoring logic transparent and easy to explain.

---

## 13. Backend and Business Logic Rules

Keep business logic separate from UI.

Recommended structure:

* `lib/evaluation/` for scoring logic
* `lib/db/` for Prisma client
* `lib/validations/` for validation schemas
* `components/` for reusable UI
* `app/` for routes and pages

Rules:

* Do not duplicate scoring logic in multiple pages.
* Keep evaluation functions testable.
* Keep API responses predictable.
* Validate user inputs.
* Handle errors clearly.
* Avoid overly complex abstractions in Phase 1.
* Prefer simple, readable code over clever code.

---

## 14. Security Rules

* Never expose API keys.
* Use `.env` for environment variables.
* Do not commit `.env`.
* Do not log sensitive user data.
* Do not expose another user’s trip data.
* Validate all form inputs.
* Keep user and admin roles separate in the database design, even if admin is not implemented in Phase 1.
* Do not implement insecure placeholder authentication as if it were production-ready.
* If using mock users in Phase 1, clearly label them as mock data.

---

## 15. Testing Rules

Add or update tests when changing the Trip Evaluation Engine.

Important test cases:

* Bad weather lowers score.
* Long travel duration lowers score.
* Late departure or arrival near sunset lowers score.
* Final score is always between 0 and 100.
* Suitability level matches the score range.
* Recommendation matches the weakest factor.

Testing priorities for Phase 1:

1. Scoring logic
2. Score level mapping
3. Recommendation generation
4. Basic data validation

---

## 16. Seed Data Rules

Include seed data for parks in Phase 1.

Seed data should include:

* Park name
* Province
* Region
* Latitude
* Longitude
* Open time
* Close time
* Description
* At least one attraction or warning when possible

Use realistic but simple seed data.

Do not overbuild seed data.

---

## 17. Codex Work Rules

When working on this project:

* Read this `AGENTS.md` before making changes.
* Default to Phase 1 scope.
* Make small, focused changes.
* Do not rewrite unrelated files.
* Do not implement out-of-scope features.
* Do not add large dependencies without asking.
* Preserve existing logic unless asked to refactor.
* Explain assumptions.
* Summarize changed files.
* Mention commands needed to run, migrate, seed, or test.
* Before editing many files, propose the plan first.

---

## 18. Required Response Style from Codex

When Codex completes a task, summarize:

1. What was changed
2. Files changed
3. How to run it
4. How to test it
5. Any assumptions or TODOs

Keep the summary concise and practical.

---

## 19. Phase 1 Definition of Done

Phase 1 is considered done when:

* Users can view park list.
* Users can search or filter parks.
* Users can view park details.
* Users can create a trip.
* Users can view My Trips.
* Users can edit or delete a trip.
* Users can evaluate a trip.
* Users can view score, level, factor breakdown, and recommendations.
* Data is stored in PostgreSQL through Prisma.
* Park seed data exists.
* Scoring logic is separated from UI.
* Core scoring logic has basic tests.
* UI works well on mobile screens.
* No Phase 2 or Phase 3 features are accidentally implemented.

---

## 20. Phase 2 Scope

Phase 2 extends the Phase 1 MVP into a **LINE MINI App-first** and **Free-first** system.

Phase 2 focuses on:

* LINE MINI App and LIFF-based entry experience
* Replacing mock current user with LINE user identity
* Free-first live data integration
* Weather integration using Open-Meteo
* Route or duration integration using OSRM and OpenStreetMap
* Sunset time calculation inside the system
* LINE notification flow with fallback for development and quota limits
* n8n Community Edition self-hosted with Docker
* Keeping the current trip evaluation formula and score interpretation unchanged

Phase 2 should build on top of Phase 1 foundations.

Do not remove or weaken Phase 1 features while implementing Phase 2.

---

## 21. Phase 2 Out of Scope

Do not implement these features in Phase 2 unless explicitly requested:

* Paid APIs
* Google Maps API
* Any API that requires billing when a free alternative is available
* Full AI Chatbot system
* Full AI Agent system
* Full Admin Dashboard
* Knowledge Base management workflow
* Full conversation history platform
* Large-scale marketing automation
* Complex staff operations tooling
* Replacing the current scoring formula

Phase 2 should stay focused on LINE MINI App readiness, free-first external data, and operational fallback design.

---

## 22. Free-First Service Rules

Phase 2 must use free-first services whenever possible.

Required defaults:

* Weather provider: `Open-Meteo`
* Route and travel duration provider: `OSRM` with `OpenStreetMap`
* Sunset time: calculate inside the application
* Workflow automation: `n8n Community Edition` self-hosted with Docker
* Database for local development: PostgreSQL with Docker
* Database for low-cost deployment if needed: Neon Free or another free PostgreSQL-compatible option

Rules:

* Do not add paid APIs by default.
* Do not use Google Maps API.
* Do not use APIs that require billing setup if a free alternative is acceptable for the thesis, demo, or MVP.
* Prefer services that can be self-hosted or swapped later without changing the application contract.

---

## 23. LINE MINI App / LIFF Rules

Phase 2 should treat the system as **LINE MINI App-first**.

Guidelines:

* LIFF should be the main client entry point for end users.
* The existing web application may remain as a shared frontend surface or fallback entry.
* Routes and UI should remain mobile-first and work well inside LINE in-app browsing contexts.
* Design flows so they can be launched from LIFF, permanent links, and Rich Menu entry points.
* Avoid implementation choices that only work well in a normal desktop browser and ignore the MINI App context.

The project should remain easy to explain as:

* a Next.js web application
* with LINE MINI App as the primary user entry in Phase 2

---

## 24. Auth Migration Rules

Phase 1 may use a mock current user.

Phase 2 should migrate toward LINE user identity.

Rules:

* Replace mock current user with LINE-based user resolution for real Phase 2 flows.
* Keep mock auth only as a clearly labeled local development fallback when necessary.
* Do not present mock auth as production-ready behavior.
* Verify LINE identity server-side.
* Keep authentication and session logic separate from UI components.
* Do not expose sensitive LINE tokens unnecessarily to the client.
* Preserve compatibility with Phase 1 data where possible and migrate incrementally.

The user model may evolve to support LINE identity, but Phase 2 should still keep the design understandable and thesis-friendly.

---

## 25. Weather / Route / Sunset Integration Rules

Phase 2 may integrate real external data, but only through free-first services.

### Weather

* Use `Open-Meteo`.
* Normalize weather responses into the existing application-friendly categories.
* Keep the evaluation logic explainable and testable.

### Route and Travel Duration

* Use `OSRM` and `OpenStreetMap`.
* Prefer a provider abstraction so the route service can later be swapped for a self-hosted setup.
* Keep route or duration integration simple and suitable for demo use.

### Sunset

* Calculate sunset time inside the system using the trip date, coordinates, and timezone.
* Do not call paid or unnecessary external sunset APIs.

### Scoring Constraint

* Do not change the scoring formula from Phase 1.
* Real integrations may replace mock inputs, but the evaluation model must remain consistent and explainable.

---

## 26. Notification Fallback Rules

Phase 2 may add LINE notifications, but notification delivery must always have a fallback path.

Rules:

* LINE Messaging should be used only within free quota and development-friendly limits.
* If LINE notification cannot be sent because of environment limits, quota limits, or development mode, the system must fall back to a mock or development log flow.
* Notification attempts should be logged in a structured way.
* Important trip flows must not depend on successful LINE delivery alone.
* Development and demo environments must still be testable without live notification delivery.

The notification strategy should be resilient, simple, and easy to explain.

---

## 27. n8n Automation Rules

Phase 2 may use `n8n Community Edition`, self-hosted with Docker.

Rules:

* Use n8n for orchestration, scheduled jobs, webhook handling support, and notification workflows.
* Do not move the main trip evaluation business logic into n8n.
* The application backend must remain the source of truth for scoring, trip state, and user data.
* n8n workflows should call internal application endpoints or services rather than reimplementing core business rules.
* Keep workflows small, auditable, and easy to demonstrate.

Typical allowed Phase 2 automation examples:

* weather refresh jobs
* reminder scheduling
* evaluation follow-up triggers
* notification fan-out or retry support

---

## 28. Phase 2 Security / Privacy Rules

Phase 2 introduces external identity, external APIs, location-aware data, and messaging surfaces.

Additional rules:

* Verify LINE identity on the server side.
* Validate LINE webhook signatures.
* Use environment variables for secrets and tokens.
* Do not log access tokens, channel secrets, or webhook secrets.
* Treat location-related data such as origin coordinates and trip context as sensitive.
* Do not expose one user's trip data to another user.
* Apply access control checks consistently across routes and APIs.
* Add clear timeout, retry, and fallback behavior for external integration calls.
* Store only the external data needed for the application, audit, or demo explanation.
* Keep privacy risk low by minimizing unnecessary retention of sensitive raw data.

Security, privacy, and explainability should remain more important than feature volume.

---

## 29. Phase 2 Sprint Plan

Suggested Phase 2 implementation order:

### Sprint 1: LINE Auth Foundation

* Introduce LINE user identity support
* Add secure session handling
* Replace mock current user in real Phase 2 flows

### Sprint 2: LINE MINI App Shell

* Add LIFF bootstrap flow
* Support MINI App entry and mobile-first initialization
* Prepare permanent link or Rich Menu entry paths

### Sprint 3: Weather and Sunset Integration

* Integrate Open-Meteo
* Add sunset calculation inside the system
* Feed live weather and sunset inputs into the existing evaluation flow

### Sprint 4: Route Integration

* Integrate OSRM and OpenStreetMap
* Add travel duration or route snapshot support
* Keep provider design simple and replaceable

### Sprint 5: Notification and Fallback Flow

* Add LINE notification sending
* Add mock and development fallback logging
* Add quota-aware notification handling

### Sprint 6: n8n Self-Hosted Automation

* Add Docker-based n8n Community setup
* Connect reminder, refresh, or follow-up workflows
* Keep automation outside the core scoring engine

### Sprint 7: Demo and Integration Polish

* Improve Rich Menu or permanent link entry
* Polish MINI App user flow
* Finalize Phase 2 thesis or demo readiness

When implementing Phase 2, keep each sprint small, testable, and aligned with the free-first strategy.
