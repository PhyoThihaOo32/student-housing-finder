-- Upgrade the original campus housing schema while preserving existing requests and placements.
BEGIN;

ALTER TABLE student ADD COLUMN password_hash text;
CREATE UNIQUE INDEX student_email_unique ON student (lower(email));

ALTER TABLE housing_request
    ADD COLUMN requested_unit_id integer REFERENCES housing_unit ON DELETE RESTRICT,
    ADD COLUMN reports_enrollment boolean,
    ADD COLUMN move_in_timeframe text CHECK (move_in_timeframe IN ('WITHIN_WEEK', 'WITHIN_MONTH', 'LATER', 'UNSURE')),
    ADD COLUMN intake_summary text,
    ADD CONSTRAINT housing_request_intake_check CHECK (
        (requested_unit_id IS NULL AND reports_enrollment IS NULL AND move_in_timeframe IS NULL AND intake_summary IS NULL)
        OR (requested_unit_id IS NOT NULL AND reports_enrollment IS NOT NULL AND move_in_timeframe IS NOT NULL)
    );

CREATE INDEX housing_request_requested_unit ON housing_request (requested_unit_id);

-- The demo accounts use the same published demo password as a fresh install.
UPDATE student s
SET password_hash = demo.password_hash
FROM (VALUES
    ('STU1001', 'maya@example.org', 'scrypt:385246052cdb7776ae1ac7d8475ebde3:e7865828b1198282ee2aa321a9067a9c6207b290b205b2e24a093e7010dbebfef98fd4ad445c1291d6e97de84bf9119bdaa04971e8680a9d7a8d574358865192'),
    ('STU1002', 'jordan@example.org', 'scrypt:00828d8367f46f936e8164736ad6e710:5872ea807adff93785e9893521688256c12b95c934e0c939da8562a2edf2dbbd7f12aceaa689346ff8ea2068c11dd6d4fc88a9c09082077d2545331059b22df6'),
    ('STU1003', 'noah@example.org', 'scrypt:92ec0e27be46a15949b5f0e61d176add:07b6733d3be8394381a400715cb9a2c4f73d0c3bd8534fe0df5d57e942a3c3a75abdec8dab3c4c206fa5ecc661a2a971a4a68ba9f69bf4fb945835bd3376e544'),
    ('STU2001', 'riley@example.org', 'scrypt:d87513397ba8cc65d2e958f7f174e29a:1a8af3e0a60963b901855841c168cb05743fdee84e4c8037ad5c2f56205b43e5d8b868e1e61588d2d2089178733994607065949947ee0511f5e50af0b73862f9')
) AS demo(student_number, email, password_hash)
WHERE s.student_number = demo.student_number AND lower(s.email) = demo.email;

COMMIT;
