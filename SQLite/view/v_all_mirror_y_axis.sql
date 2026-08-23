CREATE VIEW IF NOT EXISTS v_all_mirror_y_axis AS
SELECT n,y_id,domains_name,logic
FROM mirror_y_axis
ORDER BY n,y_id,domains_name,logic
;