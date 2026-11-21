-- Add five fictional BMCC units to existing databases.
BEGIN;

INSERT INTO housing_unit (campus_id, building_name, unit_label, unit_type)
SELECT c.campus_id, u.building_name, u.unit_label, u.unit_type
FROM (VALUES
    ('BMCC', 'Cypress Hall', '207', 'SINGLE_ROOM'),
    ('BMCC', 'Harbor Hall', '208', 'SINGLE_ROOM'),
    ('BMCC', 'Juniper Hall', '310-B', 'SHARED_ROOM_BED'),
    ('BMCC', 'Willow Hall', '401', 'SINGLE_ROOM'),
    ('BMCC', 'Willow Hall', '402-A', 'SHARED_ROOM_BED')
) AS u(campus_code, building_name, unit_label, unit_type)
JOIN campus c USING (campus_code)
ON CONFLICT DO NOTHING;

COMMIT;
