-- Add the new answers and more fictional housing units to an existing database.
BEGIN;

ALTER TABLE housing_request
    ADD COLUMN stay_through_move_in text CHECK (stay_through_move_in IN ('YES', 'NO', 'UNSURE', 'PREFER_NOT_TO_SAY')),
    ADD COLUMN expected_stay_length text CHECK (expected_stay_length IN ('LESS_THAN_SEMESTER', 'ONE_SEMESTER', 'MORE_THAN_SEMESTER', 'UNSURE')),
    ADD COLUMN open_to_another_unit text CHECK (open_to_another_unit IN ('YES', 'NO', 'UNSURE')),
    ADD CONSTRAINT housing_request_extended_intake_check CHECK (
        (stay_through_move_in IS NULL AND expected_stay_length IS NULL AND open_to_another_unit IS NULL)
        OR (requested_unit_id IS NOT NULL AND stay_through_move_in IS NOT NULL
            AND expected_stay_length IS NOT NULL AND open_to_another_unit IS NOT NULL)
    );

INSERT INTO housing_unit (campus_id, building_name, unit_label, unit_type)
SELECT c.campus_id, u.building_name, u.unit_label, u.unit_type
FROM (VALUES
    ('BMCC', 'Harbor Hall', '206', 'SINGLE_ROOM'),
    ('BMCC', 'Juniper Hall', '310-A', 'SHARED_ROOM_BED'),
    ('CCNY', 'Maple Hall', '303', 'SINGLE_ROOM'),
    ('HUNTER', 'Parkview Hall', '412', 'SINGLE_ROOM')
) AS u(campus_code, building_name, unit_label, unit_type)
JOIN campus c USING (campus_code)
ON CONFLICT DO NOTHING;

COMMIT;
