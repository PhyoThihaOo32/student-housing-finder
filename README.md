# Student Housing Finder

This is my CIS 395 database project. CUNY students can browse demo rooms and beds, submit a request, and see their housing history. Staff review requests, manage units, and record check-ins and check-outs.

[Open the live demo](https://student-housing-finder.vercel.app/)

The app uses React with Vite and an Express API with Sequelize. The frontend runs on Vercel, the API runs on Render, and the PostgreSQL database runs on Neon.

## Run locally

You need Node.js 22.12 or newer and PostgreSQL. From the project folder, create an empty database and load the tables and sample data.

```sh
createdb student_housing_finder
psql -v ON_ERROR_STOP=1 -d student_housing_finder -f database.sql
cp -n backend/.env.example backend/.env
```

In `backend/.env`, set `DATABASE_URL` for your database. Run `openssl rand -hex 32` and paste the result into `SESSION_SECRET`. The template includes the local staff login.

Start the API in one terminal.

```sh
npm --prefix backend ci
npm --prefix backend start
```

In a second terminal, start Vite and open the local URL it prints.

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

For an older local database, apply the pending SQL files in [migrations/](migrations/) in order. A fresh import of [database.sql](database.sql) already includes those changes.

## Local demo accounts

| Account | Email | Password |
| --- | --- | --- |
| BMCC student with housing history | `maya@example.org` | `HousingDemo!` |
| BMCC student with a pending request | `jordan@example.org` | `HousingDemo!` |
| BMCC student with an active placement | `noah@example.org` | `HousingDemo!` |
| City College student | `riley@example.org` | `HousingDemo!` |
| Staff | `staff@example.org` | `CampusStaffDemo!` |

On the hosted demo, use **Create an account** to try the student side. Rooms and sample records are fictional.

Housing chat can answer basic questions about the demo listings and requests. For OpenAI replies and staff intake summaries, set `OPENAI_API_KEY` and `OPENAI_MODEL` in `backend/.env` and restart the API.

## Project files

- [Database schema and sample data](database.sql)
- [ER diagram](ER_DIAGRAM.md)
- [Database design](DATABASE_DESIGN.md)
- [Project requirements](PRD.md)
