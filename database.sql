-- CIS 395 Student Housing Finder. Run once against an empty PostgreSQL database.
BEGIN;

CREATE TABLE campus (
    campus_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campus_code text NOT NULL UNIQUE CHECK (campus_code ~ '[^[:space:]]'),
    name text NOT NULL CHECK (name ~ '[^[:space:]]')
);

CREATE TABLE student (
    student_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campus_id integer NOT NULL REFERENCES campus ON DELETE RESTRICT,
    student_number text NOT NULL UNIQUE CHECK (student_number ~ '[^[:space:]]'),
    first_name text NOT NULL CHECK (first_name ~ '[^[:space:]]'),
    last_name text NOT NULL CHECK (last_name ~ '[^[:space:]]'),
    email text NOT NULL CHECK (email ~ '[^[:space:]]'),
    password_hash text
);
CREATE UNIQUE INDEX student_email_unique ON student (lower(email));

CREATE TABLE housing_unit (
    housing_unit_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campus_id integer NOT NULL REFERENCES campus ON DELETE RESTRICT,
    building_name text NOT NULL CHECK (building_name ~ '[^[:space:]]'),
    unit_label text NOT NULL CHECK (unit_label ~ '[^[:space:]]'),
    unit_type text NOT NULL CHECK (unit_type IN ('SINGLE_ROOM', 'SHARED_ROOM_BED')),
    is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX housing_unit_location_unique
    ON housing_unit (campus_id, lower(btrim(building_name)), lower(btrim(unit_label)));

CREATE TABLE housing_request (
    request_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id integer NOT NULL REFERENCES student ON DELETE RESTRICT,
    submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    preferred_unit_type text CHECK (preferred_unit_type IN ('SINGLE_ROOM', 'SHARED_ROOM_BED')),
    requested_unit_id integer REFERENCES housing_unit ON DELETE RESTRICT,
    reports_enrollment boolean,
    move_in_timeframe text CHECK (move_in_timeframe IN ('WITHIN_WEEK', 'WITHIN_MONTH', 'LATER', 'UNSURE')),
    stay_through_move_in text CHECK (stay_through_move_in IN ('YES', 'NO', 'UNSURE', 'PREFER_NOT_TO_SAY')),
    expected_stay_length text CHECK (expected_stay_length IN ('LESS_THAN_SEMESTER', 'ONE_SEMESTER', 'MORE_THAN_SEMESTER', 'UNSURE')),
    open_to_another_unit text CHECK (open_to_another_unit IN ('YES', 'NO', 'UNSURE')),
    intake_summary text,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
    decided_at timestamptz CHECK (decided_at >= submitted_at),
    denial_reason text,
    CONSTRAINT housing_request_extended_intake_check CHECK (
        (stay_through_move_in IS NULL AND expected_stay_length IS NULL AND open_to_another_unit IS NULL)
        OR (requested_unit_id IS NOT NULL AND stay_through_move_in IS NOT NULL
            AND expected_stay_length IS NOT NULL AND open_to_another_unit IS NOT NULL)
    ),
    CONSTRAINT housing_request_intake_check CHECK (
        (requested_unit_id IS NULL AND reports_enrollment IS NULL AND move_in_timeframe IS NULL AND intake_summary IS NULL)
        OR (requested_unit_id IS NOT NULL AND reports_enrollment IS NOT NULL AND move_in_timeframe IS NOT NULL)
    ),
    CONSTRAINT housing_request_decision_check CHECK (
        (status = 'PENDING' AND decided_at IS NULL AND denial_reason IS NULL)
        OR (status = 'APPROVED' AND decided_at IS NOT NULL AND denial_reason IS NULL)
        OR (status = 'DENIED' AND decided_at IS NOT NULL AND denial_reason IS NOT NULL
            AND denial_reason ~ '[^[:space:]]')
    )
);

CREATE UNIQUE INDEX housing_request_one_pending
    ON housing_request (student_id) WHERE status = 'PENDING';
CREATE INDEX housing_request_student_history ON housing_request (student_id, submitted_at DESC);
CREATE INDEX housing_request_requested_unit ON housing_request (requested_unit_id);

CREATE TABLE housing_placement (
    request_id integer PRIMARY KEY REFERENCES housing_request ON DELETE RESTRICT,
    housing_unit_id integer NOT NULL REFERENCES housing_unit ON DELETE RESTRICT,
    checked_in_at timestamptz,
    ended_at timestamptz CHECK (ended_at >= checked_in_at)
);

CREATE UNIQUE INDEX housing_placement_one_active
    ON housing_placement (housing_unit_id) WHERE ended_at IS NULL;
CREATE INDEX housing_placement_unit_history ON housing_placement (housing_unit_id);

-- College and school names: https://www.cuny.edu/about/colleges/
INSERT INTO campus (campus_code, name)
VALUES
    ('BARUCH', 'Baruch College'),
    ('BMCC', 'Borough of Manhattan Community College'),
    ('BCC', 'Bronx Community College'),
    ('BROOKLYN', 'Brooklyn College'),
    ('CSI', 'College of Staten Island'),
    ('NEWMARK', 'Craig Newmark Graduate School of Journalism'),
    ('GC', 'CUNY Graduate Center'),
    ('SPH', 'CUNY Graduate School of Public Health and Health Policy'),
    ('SLU', 'CUNY School of Labor and Urban Studies'),
    ('CUNYLAW', 'CUNY School of Law'),
    ('CUNYMED', 'CUNY School of Medicine'),
    ('SPS', 'CUNY School of Professional Studies'),
    ('GUTTMAN', 'Guttman Community College'),
    ('HOSTOS', 'Hostos Community College'),
    ('HUNTER', 'Hunter College'),
    ('JOHNJAY', 'John Jay College of Criminal Justice'),
    ('KINGSBOROUGH', 'Kingsborough Community College'),
    ('LAGUARDIA', 'LaGuardia Community College'),
    ('LEHMAN', 'Lehman College'),
    ('MACAULAY', 'Macaulay Honors College'),
    ('MEDGAREVERS', 'Medgar Evers College'),
    ('CITYTECH', 'New York City College of Technology'),
    ('QUEENS', 'Queens College'),
    ('QCC', 'Queensborough Community College'),
    ('CCNY', 'The City College of New York'),
    ('YORK', 'York College');

-- All student, unit, request, and placement rows below are fictional demo data.
INSERT INTO student (campus_id, student_number, first_name, last_name, email, password_hash)
SELECT c.campus_id, s.student_number, s.first_name, s.last_name, s.email, s.password_hash
FROM (VALUES
    ('BMCC', 'STU1001', 'Maya', 'Chen', 'maya@example.org', 'scrypt:385246052cdb7776ae1ac7d8475ebde3:e7865828b1198282ee2aa321a9067a9c6207b290b205b2e24a093e7010dbebfef98fd4ad445c1291d6e97de84bf9119bdaa04971e8680a9d7a8d574358865192'),
    ('BMCC', 'STU1002', 'Jordan', 'Rivera', 'jordan@example.org', 'scrypt:00828d8367f46f936e8164736ad6e710:5872ea807adff93785e9893521688256c12b95c934e0c939da8562a2edf2dbbd7f12aceaa689346ff8ea2068c11dd6d4fc88a9c09082077d2545331059b22df6'),
    ('BMCC', 'STU1003', 'Noah', 'Williams', 'noah@example.org', 'scrypt:92ec0e27be46a15949b5f0e61d176add:07b6733d3be8394381a400715cb9a2c4f73d0c3bd8534fe0df5d57e942a3c3a75abdec8dab3c4c206fa5ecc661a2a971a4a68ba9f69bf4fb945835bd3376e544'),
    ('CCNY', 'STU2001', 'Riley', 'Brooks', 'riley@example.org', 'scrypt:d87513397ba8cc65d2e958f7f174e29a:1a8af3e0a60963b901855841c168cb05743fdee84e4c8037ad5c2f56205b43e5d8b868e1e61588d2d2089178733994607065949947ee0511f5e50af0b73862f9')
) AS s(campus_code, student_number, first_name, last_name, email, password_hash)
JOIN campus c USING (campus_code);

INSERT INTO housing_unit (campus_id, building_name, unit_label, unit_type, is_active)
SELECT c.campus_id, u.building_name, u.unit_label, u.unit_type, u.is_active
FROM (VALUES
    ('BMCC', 'Cypress Hall', '204', 'SINGLE_ROOM', true),
    ('BMCC', 'Cypress Hall', '205-A', 'SHARED_ROOM_BED', true),
    ('BMCC', 'Cypress Hall', '205-B', 'SHARED_ROOM_BED', true),
    ('BMCC', 'Harbor Hall', '112', 'SINGLE_ROOM', false),
    ('CCNY', 'Maple Hall', '301', 'SINGLE_ROOM', true),
    ('CCNY', 'Maple Hall', '302-A', 'SHARED_ROOM_BED', true),
    ('BMCC', 'Harbor Hall', '206', 'SINGLE_ROOM', true),
    ('BMCC', 'Juniper Hall', '310-A', 'SHARED_ROOM_BED', true),
    ('CCNY', 'Maple Hall', '303', 'SINGLE_ROOM', true),
    ('HUNTER', 'Parkview Hall', '412', 'SINGLE_ROOM', true)
) AS u(campus_code, building_name, unit_label, unit_type, is_active)
JOIN campus c USING (campus_code);

INSERT INTO housing_request (student_id, submitted_at, preferred_unit_type, status, decided_at, denial_reason)
SELECT s.student_id, CURRENT_TIMESTAMP - (r.submitted_days * interval '1 day'),
       r.unit_type, r.status, CURRENT_TIMESTAMP - (r.decided_days * interval '1 day'), r.reason
FROM (VALUES
    ('STU1001', 45, 'SINGLE_ROOM', 'DENIED', 44, 'All single rooms were reserved at the time of review.'),
    ('STU1001', 42, 'SHARED_ROOM_BED', 'APPROVED', 41, NULL),
    ('STU1002', 1, 'SINGLE_ROOM', 'PENDING', NULL, NULL),
    ('STU1003', 5, 'SHARED_ROOM_BED', 'APPROVED', 4, NULL)
) AS r(student_number, submitted_days, unit_type, status, decided_days, reason)
JOIN student s USING (student_number);

INSERT INTO housing_placement (request_id, housing_unit_id, checked_in_at, ended_at)
SELECT r.request_id, u.housing_unit_id,
       CURRENT_TIMESTAMP - (p.check_in_days * interval '1 day'),
       CURRENT_TIMESTAMP - (p.check_out_days * interval '1 day')
FROM (VALUES
    ('STU1001', '205-A', 40, 12),
    ('STU1003', '205-B', 3, NULL)
) AS p(student_number, unit_label, check_in_days, check_out_days)
JOIN student s USING (student_number)
JOIN housing_request r ON r.student_id = s.student_id AND r.status = 'APPROVED'
JOIN housing_unit u ON u.campus_id = s.campus_id AND u.building_name = 'Cypress Hall'
    AND u.unit_label = p.unit_label;

COMMIT;
