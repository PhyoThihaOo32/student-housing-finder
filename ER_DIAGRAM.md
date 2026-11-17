# Student Housing ER Diagram

```mermaid
erDiagram
    direction TB
    accTitle: Student Housing Finder database

    campus {
        integer campus_id PK
        text campus_code UK
        text name
    }

    student {
        integer student_id PK
        integer campus_id FK
        text student_number UK
        text first_name
        text last_name
        text email UK
        text password_hash
    }

    housingUnit["housing_unit"] {
        integer housing_unit_id PK
        integer campus_id FK
        text building_name
        text unit_label
        text unit_type
        boolean is_active
    }

    housingRequest["housing_request"] {
        integer request_id PK
        integer student_id FK
        integer requested_unit_id FK
        timestamptz submitted_at
        text preferred_unit_type
        boolean reports_enrollment
        text move_in_timeframe
        text stay_through_move_in
        text expected_stay_length
        text open_to_another_unit
        text intake_summary
        text status
        timestamptz decided_at
        text denial_reason
    }

    housingPlacement["housing_placement"] {
        integer request_id PK, FK
        integer housing_unit_id FK
        timestamptz checked_in_at
        timestamptz ended_at
    }

    campus ||..o{ student : enrolls
    campus ||..o{ housingUnit : manages
    student ||..o{ housingRequest : submits
    housingUnit |o..o{ housingRequest : "is requested in"
    housingRequest ||--o| housingPlacement : "results in"
    housingUnit ||..o{ housingPlacement : hosts
```

**PK** means primary key, **FK** means foreign key, and **UK** means unique key.

- A student can have one pending request at a time. Each unit can have one active placement at a time.
- New requests select a specific unit. Older records may store only a room type preference.
- Approval creates a placement using the request ID. A denial keeps the reason on the request.
- Student email is unique regardless of case. Each campus, building, and unit label combination identifies one housing unit.

[PostgreSQL schema](database.sql) · [Database design](DATABASE_DESIGN.md) · [UML diagram for class](Housing-ER-Model.svg)
