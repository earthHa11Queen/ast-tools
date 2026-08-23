INSERT INTO mirror_y_axis(n,y_id,domains_name,logic)
SELECT CAST(n AS integer),y_id,domains_name,logic
FROM mirror_y_axis_tmp
ORDER BY n,y_id,domains_name,logic
;