# Student Housing Finder

**Product requirements document · CIS 395 final project · Topic 6, Housing Resources for Students**

## Project overview

Student Housing Finder is a housing request and placement app for CUNY campuses. Students can view available rooms or beds at their campus, submit one request at a time, and see the decisions and placements associated with their requests. Campus staff manage housing units, review requests, assign available spaces, and record check-in and check-out. The campus names come from CUNY's directory. Demo students, housing units, requests, and placements are fictional. [CUNY Colleges & Schools](https://www.cuny.edu/about/colleges/)

## Product requirements

| ID | Feature | Required behavior |
| --- | --- | --- |
| FR-1 | Student housing requests | Students choose an available unit, complete the intake chat, and submit a pending request. They can view, edit, or withdraw their own pending request. |
| FR-2 | Staff decisions | Staff approve and reserve the requested unit if available, or deny with a reason. A student can reapply after denial. |
| FR-3 | Housing inventory | Staff can create, view, edit, and delete unused housing units. Units with placement history can be retired when their active placement ends. |
| FR-4 | Placement history | Approval reserves the unit. Staff record check-in, check-out, or release before move-in. A student's history shows requests, decisions, denial reasons, and placement details. |
| FR-5 | Housing availability | Students can view available units at their campus. Availability depends on the inventory flag and whether the unit has an active placement. |
| FR-6 | Housing intake chat | Ask five short questions about enrollment, move-in timing, a place to stay until move-in, expected stay length, and willingness to consider another unit on campus. Store the answers for staff. OpenAI can generate an optional summary from the five answers. |
| FR-7 | Email and password | Students register with their first and last names, campus, email, and password. Students and staff use the same sign-in form. |

The React interface stays minimal and works at desktop and phone widths. Browsing, intake, request history, staff review, and housing inventory have separate pages. Staff make all housing decisions.

## Database and stack

The five entities are `Campus`, `Student`, `HousingUnit`, `HousingRequest`, and `HousingPlacement`. The normalized schema uses primary and foreign keys, PostgreSQL constraints, and a transaction for approval and assignment. The standalone `database.sql` contains the table definitions and sample inserts. **HousingRequest** and **HousingUnit** are the two full CRUD tables. [Database design](DATABASE_DESIGN.md) · [Lecture 06 UML ER diagram](Housing-ER-Model.svg)

Use JavaScript, React with Vite, Express.js, Sequelize, and PostgreSQL. The planned hosting uses Vercel for React, Render for Express, and Neon for PostgreSQL. Local setup remains available for grading.

## Acceptance criteria

1. Import `database.sql` into an empty PostgreSQL database. Start both services and sign in with the seeded demo credentials.
2. Register a student, select an available unit on the student's campus, and answer all five intake questions. Create, read, edit, and withdraw a pending request. Verify that a second pending request is rejected.
3. Deny a request with a required reason, then submit a new request. Approve it and reserve the requested unit. Verify that the same unit is unavailable for a second placement.
4. Check the student in and out and verify that housing history preserves the decision, assigned unit, and stay dates.
5. Use the staff GUI to add, view, edit, and delete an unused unit. Verify that a unit with history can be retired and remains linked to its past placements.

## Course submission

- **ZIP file** with all application files, local setup instructions, and `database.sql` containing `CREATE TABLE` and sample `INSERT` statements.
- **Submission textbox** with partner name if applicable, project topic, title, brief description, programming language, DBMS, and recording link. Add the hosted app link when deployed. GitHub is optional.
- **Slides** explaining the problem, your solution and how it helps, why you chose the approach, challenges, and lessons learned. Include screenshots of the interface, key features, and database tables. The ER/EER diagram is encouraged.
- **Five-minute video** introducing the topic and purpose, walking through the main screens, demonstrating CRUD, and explaining the database interaction and key design decisions. Upload the video and include its link in the submission textbox. Use **Unlisted** visibility if hosting on YouTube.
