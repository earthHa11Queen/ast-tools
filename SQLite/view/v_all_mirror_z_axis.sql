CREATE VIEW IF NOT EXISTS v_all_mirror_z_axis AS
SELECT n,category_id,group_id,z_type,z_name,z_id,variants
FROM mirror_z_axis
ORDER BY n,category_id,group_id,z_type,z_name,z_id,variants
;