INSERT INTO mirror_z_axis(n,category_id,group_id,z_type,z_name,z_id,variants)
SELECT CAST(n AS integer),category_id,group_id,z_type,z_name,z_id,variants
FROM mirror_z_axis_tmp
ORDER BY n,category_id,group_id,z_type,z_name,z_id,variants
;