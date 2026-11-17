# Student Housing Finder

A CIS 395 database project for submitting housing requests, assigning rooms or beds, and tracking placement history at CUNY campuses. The campus directory uses CUNY college and school names. Students, rooms, requests, and placements are fictional demo records. [CUNY Colleges & Schools](https://www.cuny.edu/about/colleges/)

## Run locally

Use Node.js 22.12 or newer and a running PostgreSQL instance. From the project root, create an empty project database and load the schema and fictional sample records once.

```sh
createdb student_housing_finder
psql -v ON_ERROR_STOP=1 -d student_housing_finder -f database.sql
```

For an existing database, apply any pending scripts in `migrations/` once in filename order. Run each with `psql -v ON_ERROR_STOP=1 -d student_housing_finder -f <migration-file>`. Fresh databases loaded from `database.sql` already include these changes.

Create `backend/.env` from `backend/.env.example` on a fresh checkout. Set `DATABASE_URL`, `STAFF_EMAIL`, and `STAFF_PASSWORD`. Use the output of `openssl rand -hex 32` for `SESSION_SECRET`. Existing local setups can replace the old access-code variables with the staff email and password from the template.

Start the API in one terminal.

```sh
npm --prefix backend ci
npm --prefix backend start
```

Start the frontend in a second terminal.

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open the **Local** URL Vite prints. By default, it forwards `/api` requests to Express on port 3000. Append `/api/health` to the frontend URL to check the API and database connection. If you change the backend port, set `API_PROXY_TARGET` when starting Vite, for example `API_PROXY_TARGET=http://127.0.0.1:3310 npm --prefix frontend run dev`.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| BMCC student with history | `maya@example.org` | `HousingDemo!` |
| BMCC student with a pending request | `jordan@example.org` | `HousingDemo!` |
| BMCC student with an active placement | `noah@example.org` | `HousingDemo!` |
| City College student | `riley@example.org` | `HousingDemo!` |
| Campus staff | `staff@example.org` | `CampusStaffDemo!` |

Students can create an account with their name, CUNY campus, email, and password. In **Browse housing**, select a unit and answer the five intake questions. In **My requests**, view decisions, update or withdraw pending requests, and see placement history. Staff sign in through the same page and use **Review requests** and **Housing units**. Student passwords are salted and hashed in PostgreSQL. The single staff account is set through the server environment. Replace demo credentials and the session secret for a hosted demo.

The housing form asks about enrollment, move-in timing, whether the student has somewhere to stay until move-in, expected stay length, and willingness to consider another unit on campus. With the instructor-provided `OPENAI_API_KEY` and an available `OPENAI_MODEL`, the API sends only the five selected answers for a short staff summary. Staff can review the saved answers if the summary is unavailable. Staff make and record each decision. [OpenAI Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create)

Students can select **Ask about housing** on the browse page for current demo availability, application steps, and request tracking help. Basic replies work without a key. To enable OpenAI replies, set `OPENAI_API_KEY` and `OPENAI_MODEL` in `backend/.env` and restart the backend. The API sends the current question and a snapshot of available demo units at the student's campus. The chat transcript lives on the browse page for the current visit.

## Project references

- [Database design and business rules](DATABASE_DESIGN.md)
- [ER diagram in Lecture 06 UML notation](Housing-ER-Model.svg)
- [Project requirements and submission checklist](PRD.md)

## Build and hosting

```sh
npm --prefix frontend run lint
npm --prefix frontend run build
```

Students can create an account in the [hosted demo](https://student-housing-finder.vercel.app/). The demo passwords listed above are for local development. Render stores the hosted staff credentials and the Neon connection string in the API service environment.

The hosted demo uses **Neon** for PostgreSQL, **Render** for Express, and **Vercel** for Vite. The Render Blueprint builds `backend/` from the private repository and checks `/api/health`. Vercel builds `frontend/`, where `vercel.json` routes `/api/*` to Render through the same browser origin.
