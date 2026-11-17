# Student Housing Finder · Database Design

CIS 395 · Topic 6, Housing Resources for Students

[GitHub ER diagram](ER_DIAGRAM.md) · [UML diagram for class](Housing-ER-Model.svg) · [Lucidchart draft](https://lucid.app/lucidchart/f2bfedb9-eebc-4438-b984-2b0cf1ec7ab1/edit?page=0_0)

## Scope and assumptions

`Campus` represents a college or school in the [CUNY directory](https://www.cuny.edu/about/colleges/). The demo includes fictional housing at BMCC, The City College of New York, and Hunter College.

Students request housing through their campus. Staff approve a request by reserving a specific space or deny it with a reason. A student can reapply after a denial or after their previous placement ends. Each student belongs to one campus, and staff place students in housing at that campus. Each housing unit represents a space for one student. For shared rooms, give each bed its own unit label, such as `204-A` and `204-B`. The design reserves an available unit as soon as the request is approved.

## Entities and attributes

Primary keys are generated integers, except `HousingPlacement.requestId`, which is also a foreign key. Attributes are required unless marked optional. Use PostgreSQL `timestamptz` for event times and snake_case for SQL identifiers.

### Campus

| Attribute | PostgreSQL type | Constraint or meaning |
| --- | --- | --- |
| `campusId` | integer | Primary key |
| `campusCode` | text | Unique, nonblank code |
| `name` | text | Nonblank display name |

### Student

| Attribute | PostgreSQL type | Constraint or meaning |
| --- | --- | --- |
| `studentId` | integer | Primary key |
| `campusId` | integer | Foreign key to `Campus.campusId` |
| `studentNumber` | text | Unique internal identifier, generated on signup |
| `firstName` | text | Nonblank given name |
| `lastName` | text | Nonblank family name |
| `email` | text | Student sign-in and contact email, unique ignoring case |
| `passwordHash` | text | Salted scrypt hash. Null for an older record awaiting account setup |

### HousingUnit

| Attribute | PostgreSQL type | Constraint or meaning |
| --- | --- | --- |
| `housingUnitId` | integer | Primary key |
| `campusId` | integer | Foreign key to `Campus.campusId` |
| `buildingName` | text | Nonblank building name |
| `unitLabel` | text | Nonblank room or bed label |
| `unitType` | text | `SINGLE_ROOM` or `SHARED_ROOM_BED` |
| `isActive` | boolean | Defaults to true. False retires a space from inventory |

The combination `(campusId, buildingName, unitLabel)` is unique. The PostgreSQL index ignores case and surrounding spaces in the building name and unit label.

### HousingRequest

| Attribute | PostgreSQL type | Constraint or meaning |
| --- | --- | --- |
| `requestId` | integer | Primary key |
| `studentId` | integer | Foreign key to `Student.studentId` |
| `submittedAt` | timestamptz | Defaults to the submission time |
| `preferredUnitType` | text | Optional. Preserves an earlier unit-type preference in historical records |
| `requestedUnitId` | integer | Foreign key to `HousingUnit.housingUnitId`. Required for new requests |
| `reportsEnrollment` | boolean | Self-reported enrollment at the selected campus |
| `moveInTimeframe` | text | Self-reported move-in timing from a defined set of choices |
| `stayThroughMoveIn` | text | Whether the student has somewhere to stay until move-in. Includes a choice to decline answering |
| `expectedStayLength` | text | Estimated stay length in semester ranges |
| `openToAnotherUnit` | text | Whether the student would consider another room or bed at their campus |
| `intakeSummary` | text | Optional AI-assisted summary of the submitted answers |
| `status` | text | Defaults to `PENDING`. Allowed values are `PENDING`, `APPROVED`, and `DENIED` |
| `decidedAt` | timestamptz | Optional while pending. Required for approval or denial |
| `denialReason` | text | Nonblank for a denial. Null for pending and approved requests |

`decidedAt` must be at or after `submittedAt`. A decision closes the request. A later application gets its own request ID.

### HousingPlacement

| Attribute | PostgreSQL type | Constraint or meaning |
| --- | --- | --- |
| `requestId` | integer | Primary key and foreign key to `HousingRequest.requestId` |
| `housingUnitId` | integer | Foreign key to `HousingUnit.housingUnitId` |
| `checkedInAt` | timestamptz | Optional actual check-in time |
| `endedAt` | timestamptz | Optional time the placement ended and the unit was released |

The approval time comes from the request's `decidedAt`. When `endedAt` is null, the placement is active and the space is reserved. When both dates are present, `endedAt` is the check-out time and must follow or equal `checkedInAt`. An end time with no check-in records a release before move-in.

## Relationships and multiplicities

| UML relationship | Left end | Right end | Business rule |
| --- | --- | --- | --- |
| `Campus Enrolls Student` | `1` | `0..*` | Every student belongs to one campus |
| `Campus Manages HousingUnit` | `1` | `0..*` | Every unit belongs to one campus |
| `Student Submits HousingRequest` | `1` | `0..*` | A student's history can contain many requests |
| `HousingRequest Targets HousingUnit` | `0..*` | `0..1` | Several students can request a unit while it is available. A new request targets exactly one unit. Earlier requests can have a unit-type preference |
| `HousingRequest ResultsIn HousingPlacement` | `1` | `0..1` | Approved requests have exactly one placement. Pending and denied requests have zero |
| `HousingUnit Hosts HousingPlacement` | `1` | `0..*` | A unit can host many placements over time |

The `0..*` on a student's requests describes lifetime history. The one-pending-request constraint applies only to current requests. Follow Lecture 06 by showing entity rectangles, primary keys first with `{PK}`, verb labels with reading direction, and numeric multiplicities at both ends.

## Integrity rules

| Rule | Enforcement |
| --- | --- |
| A student has at most one pending request | PostgreSQL partial unique index on `housing_request(student_id)` where `status = 'PENDING'` |
| A unit has at most one active placement | PostgreSQL partial unique index on `housing_placement(housing_unit_id)` where `ended_at IS NULL` |
| A request has at most one placement | `housing_placement.request_id` is both the primary key and a foreign key |
| New or updated requests contain five answers | The API requires all five answers. PostgreSQL `CHECK` constraints limit answer choices and require enrollment and move-in timing for unit-specific requests. The three newer fields are either all filled for a unit-specific intake or all null for earlier records |
| Students request units on their campus | The API locks the selected unit and checks campus and availability before saving intake. Requests reserve space when staff approve them |
| Decision fields match status | PostgreSQL `CHECK` requires a decision time for either final status and a trimmed, nonblank reason for a denial. Pending rows have null decision fields |
| Placement times are consistent | PostgreSQL `CHECK` orders check-in and end when both exist. Staff record check-in or release after approval, and the API uses the current PostgreSQL time for those actions |
| Approval creates a placement | The API locks and rechecks the pending request, student, and selected unit in a transaction. It verifies the student's campus, the unit's active status, and availability. It updates the request and inserts its placement together |
| A student can reapply once eligible | Submission checks for an active placement while locking the same student row used by the approval transaction. The pending-request index handles concurrent submissions |
| Historical records stay connected | All foreign keys use `ON DELETE RESTRICT`. Students can withdraw pending requests, and staff can delete units that have no requests or placements. Staff retire referenced units and preserve their campus, location, and type |

If concurrent approvals target the same space, the unique index rejects the second placement and the transaction rolls back its approval. After a placement ends, the unit is available again if it remains active. Lock the unit during retirement and check that its current placement has ended first.

## Normalization and history

- **First normal form.** Each request, room or bed, and placement has its own row with individual attribute values.
- **Second normal form.** Every table uses a single-column primary key. Each attribute describes the row identified by that key.
- **Third normal form.** Campus names live on `Campus`, student details on `Student`, and building and unit labels on `HousingUnit`. A building name is a location label in this design. Each decision lives on its request and each check-in or end time lives on its placement.
- **Student history.** Read `Student → HousingRequest → HousingPlacement → HousingUnit` using left joins from requests to placements and units. This keeps pending and denied requests visible alongside approved requests, assigned units, and completed stays. Whether a unit is available comes from its inventory flag and its active placements.
- **Decision history.** Every request receives at most one final decision. A student's new attempt after a denial has a new row, so its decision is recorded independently.

## Course demo

Show create, read, update, and delete on **HousingRequest** and **HousingUnit** through the GUI. Use synthetic student records for the demo.

1. Add a housing unit, view it, edit a field, and delete a second unused unit.
2. Register a student, choose a unit, answer the intake questions, and submit a request. Edit the pending request and confirm a second pending submission is rejected.
3. Deny the pending request with a reason and create a new request. Approve the new request with an available unit and show that the unit becomes reserved.
4. Check the student in, then record check-out. Open their history and show the denied request, the reason, the approved request, and the completed stay. Delete a separate pending test request to demonstrate request deletion.
