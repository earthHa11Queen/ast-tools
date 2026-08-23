-- ============================================================
-- test_spec
-- ============================================================

DROP INDEX IF EXISTS idx_test_spec_target_id;

DROP INDEX IF EXISTS idx_test_spec_target_x;

DROP INDEX IF EXISTS idx_test_spec_target_y;

DROP INDEX IF EXISTS idx_test_spec_target_z;

DROP INDEX IF EXISTS idx_test_spec_case_no;

DROP INDEX IF EXISTS idx_test_spec_logical_case;


-- ============================================================
-- test_spec_validation_candidates
-- ============================================================

DROP INDEX IF EXISTS idx_test_spec_validation_candidates_axis;


-- ============================================================
-- test_spec_validation_targets
-- ============================================================

-- targetId PRIMARY KEY による自動INDEXはDROP対象外。

DROP INDEX IF EXISTS idx_test_spec_validation_candidates_axis;
DROP INDEX IF EXISTS idx_args_data_method;
DROP INDEX IF EXISTS idx_args_data_object_root_id;
DROP INDEX IF EXISTS idx_object_data_parent_object_id;
DROP INDEX IF EXISTS idx_dto_data_dto_name;
DROP INDEX IF EXISTS idx_field_data_dto_field;
DROP INDEX IF EXISTS idx_field_data_object_root_id;
DROP INDEX IF EXISTS idx_enum_data_name_index;
DROP INDEX IF EXISTS idx_lang_data_models_language_model;
DROP INDEX IF EXISTS idx_return_data_method;
