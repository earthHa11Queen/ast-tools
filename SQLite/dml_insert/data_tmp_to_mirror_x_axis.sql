INSERT INTO mirror_x_axis(n,root_id,branch_id,leaf_id,leaf_edge_id,x_id,x_name)
SELECT CAST(n AS integer),root_id,branch_id,leaf_id,leaf_edge_id,x_id,x_name
FROM mirror_x_axis_tmp
ORDER BY n,root_id,branch_id,leaf_id,leaf_edge_id,x_id,x_name
;