-- ============================================================
-- test_spec
-- ============================================================

-- target単位のJOIN・抽出
CREATE INDEX IF NOT EXISTS idx_test_spec_target_id
ON test_spec(targetId);


-- X candidate membership
CREATE INDEX IF NOT EXISTS idx_test_spec_target_x
ON test_spec(
    targetId,
    観点ID_X
);


-- Y candidate membership / Y coverage
CREATE INDEX IF NOT EXISTS idx_test_spec_target_y
ON test_spec(
    targetId,
    観点ID_Y
);


-- Z candidate membership
CREATE INDEX IF NOT EXISTS idx_test_spec_target_z
ON test_spec(
    targetId,
    観点ID_Z
);


-- CaseNo重複チェック
CREATE INDEX IF NOT EXISTS idx_test_spec_case_no
ON test_spec(
    CaseNo
);


-- 論理ケース重複チェック
CREATE INDEX IF NOT EXISTS idx_test_spec_logical_case
ON test_spec(
    targetId,
    観点ID_X,
    観点ID_Y,
    観点ID_Z
);


-- ============================================================
-- test_spec_validation_candidates
-- ============================================================

-- PRIMARY KEY(targetId, axis, mirrorId) が既にあるなら、
-- targetId → axis → mirrorId の検索INDEXは追加不要。
--
-- Y candidateだけを先に絞る処理が多いため、
-- axis起点の検索用INDEXを追加する。
CREATE INDEX IF NOT EXISTS idx_test_spec_validation_candidates_axis
ON test_spec_validation_candidates(
    axis,
    targetId,
    mirrorId
);


-- ============================================================
-- test_spec_validation_targets
-- ============================================================

-- targetId PRIMARY KEY のため追加INDEX不要。

-- ============================================================
-- args_data
-- ============================================================

-- method単位の引数取得
-- v_junit_data_instruction_expand / v_all_targets の双方で使用
CREATE INDEX IF NOT EXISTS idx_args_data_method
ON args_data(
    filePath,
    className,
    methodName,
    process1,
    argIndex
);


-- objectRootIdを持つ構造化引数の取得
CREATE INDEX IF NOT EXISTS idx_args_data_object_root_id
ON args_data(
    objectRootId
)
WHERE objectRootId > 0;


-- ============================================================
-- object_data
-- ============================================================

-- ARRAY / COLLECTION / MAP の子ノード探索
-- 今回の有限level展開で最重要
CREATE INDEX IF NOT EXISTS idx_object_data_parent_object_id
ON object_data(
    parentObjectId,
    objectId
);


-- objectIdはPRIMARY KEYのため単独INDEX追加不要。


-- ============================================================
-- dto_data
-- ============================================================

-- referenceType(dtoName) からDTO field一覧を取得
CREATE INDEX IF NOT EXISTS idx_dto_data_dto_name
ON dto_data(
    dtoName,
    filePath,
    fieldName
);


-- ============================================================
-- field_data
-- ============================================================

-- dto_dataから実フィールド情報へのJOIN
CREATE INDEX IF NOT EXISTS idx_field_data_dto_field
ON field_data(
    filePath,
    className,
    fieldName
);


-- objectRootIdを持つFieldから
-- ARRAY / COLLECTION / MAP構造へ接続
CREATE INDEX IF NOT EXISTS idx_field_data_object_root_id
ON field_data(
    objectRootId
)
WHERE objectRootId > 0;


-- ============================================================
-- enum_data
-- ============================================================

-- enumName単位のJOINおよびenumIndex順GROUP_CONCAT
CREATE INDEX IF NOT EXISTS idx_enum_data_name_index
ON enum_data(
    enumName,
    enumIndex
);


-- ============================================================
-- lang_data_models
-- ============================================================

-- LOWER(language)='java' + data_model の検索
-- SQL側がLOWER(language)を使用しているため式INDEXとする
CREATE INDEX IF NOT EXISTS idx_lang_data_models_language_model
ON lang_data_models(
    LOWER(language),
    data_model
);


-- ============================================================
-- return_data
-- ============================================================

-- v_all_targets / v_ai_input生成時のmethod単位JOIN
CREATE INDEX IF NOT EXISTS idx_return_data_method
ON return_data(
    filePath,
    className,
    methodName,
    process1
);


-- ============================================================
-- SQLite query planner statistics
-- ============================================================

ANALYZE;

PRAGMA optimize;