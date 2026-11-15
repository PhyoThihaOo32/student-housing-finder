# Student Housing Finder

**Product requirements document · CIS 395 final project · Topic 6, Housing Resources for Students**

## Project overview

Student Housing Finder helps BMCC students and their families find NYC affordable rental lotteries that are accepting applications. They can search by name or address, narrow results by borough and application deadline, and open the official Housing Connect page to check requirements and apply. The public search works without an account.

The first release is a searchable collection of verified rental opportunities. Results show the application deadline, building locations, and when the listing was last checked. A plain-language search option helps students express what they want in one step, such as “Brooklyn lotteries closing in the next two weeks.”

## Product requirements

| ID | Feature | Required behavior |
| --- | --- | --- |
| FR-1 | Search open rental lotteries | Browse lotteries accepting applications. Search by lottery name or building address. Filter by borough and deadline. Sort by earliest deadline by default, and show each lottery once even if multiple addresses match. |
| FR-2 | View a listing | Show the lottery name, associated building addresses, boroughs, application deadline, last-checked date, and official Housing Connect link. Include a link to Housing Connect's full open-lottery search on the results page. |
| FR-3 | Manage lotteries | A signed-in maintainer can create, view, edit, and delete lottery records through the GUI. Validate required fields, application dates, and official links. Confirm deletion and explain when a lottery still has associated locations. |
| FR-4 | Manage locations | A signed-in maintainer can create, view, edit, and delete location records through the GUI. Each location must be assigned to a lottery. Address and borough changes should be reflected in search results. |
| FR-5 | Search with AI | Convert short, plain-language queries into the same supported search filters. Show the filters applied so users can correct them. The API validates the filters and PostgreSQL returns the matching listings. Manual search stays available if AI is unavailable or the query is unsupported. |

The app should work at phone and desktop widths. Use labeled controls, keyboard-accessible forms, and loading, error, and empty states. An empty result should let the user clear filters or go directly to Housing Connect.

## Data sources and listing freshness

- **NYC Open Data** supplies lottery names, status, and dates from the lottery-level dataset, and addresses and boroughs from the building-level dataset. Join records on the source Lottery ID. Both datasets publish monthly, and their records include historical lotteries. [Advertised Lotteries by Lottery](https://data.cityofnewyork.us/Housing-Development/Advertised-Lotteries-on-Housing-Connect-by-Lottery/vy5i-a666) · [Advertised Lotteries by Building](https://data.cityofnewyork.us/Housing-Development/Advertised-Lotteries-on-Housing-Connect-By-Buildin/nibs-na6y)
- **NYC Housing Connect** is the source for confirming whether an application is open and where to apply. Start with a small selection of rentals checked against the live portal. Record the last check and recheck the listings before launch and recording. The first release uses manual updates through the management screen. [Housing Connect open lotteries](https://housingconnect.nyc.gov/PublicWeb/search-lotteries)
- **Public results** show listings whose stored status indicates they are accepting applications and whose application window includes the current New York date or time. Use the official closing time when available and treat a date-only deadline as inclusive in New York. Send students to Housing Connect for the latest status, current requirements, and application.
- **Future search filters** can include rent, bedroom size, and household size once the corresponding unit-level information is verified and stored. A lottery-wide price range alone is insufficient for matching a specific household to an advertised unit.

## Database and ER model

| Entity | Proposed fields | Application access |
| --- | --- | --- |
| `RentalLottery` | `lotteryId` (PK), `sourceLotteryId` (unique when provided), `name`, `applicationOpensOn`, `applicationClosesOn`, `applicationStatus`, `applicationUrl`, `lastVerifiedAt` | Full CRUD |
| `LotteryLocation` | `locationId` (PK), `lotteryId` (required FK), `streetAddress`, `borough`, `postalCode` | Full CRUD |

**RentalLottery Includes LotteryLocation.** A lottery can have several advertised building addresses. Each location belongs to exactly one lottery. A draft lottery can have zero locations, and public search requires at least one. Place `1` next to `RentalLottery` and `0..*` next to `LotteryLocation`. Store deadlines and status once on the lottery. PostgreSQL enforces the foreign key and prevents deleting a lottery while it has associated location records.

Use Lecture 06 UML notation with entity rectangles, primary keys first and tagged `{PK}`, verb labels, arrows showing reading direction, and multiplicities at both ends. Verify the logical schema against third normal form and export the ER diagram as SVG.

## Technical approach and deployment

- **Vercel** hosts the React search, listing detail, and maintenance interface. The frontend gets the API URL from configuration.
- **Render** hosts the Express.js API, including search, protected CRUD, and the OpenAI integration. Express checks maintainer authorization on every write endpoint. The OpenAI key and database credentials are configured on Render.
- **Neon** hosts PostgreSQL. Express connects through Sequelize. The same app can run locally against a PostgreSQL database configured for grading.
- **OpenAI** maps natural-language inputs to a validated set of filters. The API queries PostgreSQL and uses stored listing details and official links in the results. The public AI endpoint is rate-limited, and the app does not save the query text.
- **`database.sql`** creates the relational schema and includes sample data for local setup and grading. Populate the hosted database with checked listings and keep synthetic grading examples in the local demo database.

## Acceptance criteria

1. On the hosted Vercel site, a visitor can search by name or address, narrow results by borough and deadline, and follow an official application link. Results and details come from the Render API backed by Neon.
2. An expired listing drops out of public search. A lottery with two matching locations appears once and its detail view shows both addresses. Each public result displays its last-checked date.
3. In the GUI, the maintainer creates a lottery and assigns a location, views and edits both, and reloads to confirm persistence. The database blocks deleting the lottery while the location exists. The maintainer then deletes the location and the lottery. An unauthenticated write request is rejected.
4. A phrase such as “Brooklyn lotteries closing in the next two weeks” applies the Brooklyn and deadline filters, with the same results as setting them manually. Manual search continues to work if AI is unavailable.
5. Starting with an empty local PostgreSQL database, running `database.sql` creates all tables and inserts sample records. The documented steps start the app locally and support the CRUD demonstration.

## Course submission

- **ZIP file** with all application files, local setup instructions, and `database.sql` containing `CREATE TABLE` and sample `INSERT` statements.
- **Submission textbox** with partner name if applicable, project topic, project title, brief description, programming language, database system, and recording link. Include the deployed app link. The GitHub link is optional.
- **Slides** explaining the problem, solution, how the solution addresses the problem, why this approach was chosen, challenges, and lessons learned. Include screenshots of the app, key features, and database tables. The ER/EER diagram is encouraged on the slides.
- **Five-minute video** introducing the topic and purpose, walking through the main screens, demonstrating create, read, update, and delete, and explaining database interaction and key design decisions. Upload the recording and include the link in the submission textbox. Use **Unlisted** visibility if hosting on YouTube.
