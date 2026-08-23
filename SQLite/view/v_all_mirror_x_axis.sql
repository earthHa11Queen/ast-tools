CREATE VIEW IF NOT EXISTS v_all_mirror_x_axis AS
SELECT n,root_id,branch_id,leaf_id,leaf_edge_id,x_id,x_name
FROM mirror_x_axis
ORDER BY n,root_id,branch_id,leaf_id,leaf_edge_id,x_id,x_name
;