CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_required AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
WHERE
       ts.CaseNo IS NULL
    OR TRIM(ts.CaseNo) = ''

    OR ts.targetId IS NULL
    OR TRIM(ts.targetId) = ''

    OR ts.大分類 IS NULL
    OR TRIM(ts.大分類) = ''

    OR ts.中分類 IS NULL
    OR TRIM(ts.中分類) = ''

    OR ts.小分類 IS NULL
    OR TRIM(ts.小分類) = ''

    OR ts.観点ID_X IS NULL
    OR TRIM(ts.観点ID_X) = ''

    OR ts.観点ID_Y IS NULL
    OR TRIM(ts.観点ID_Y) = ''

    OR ts.観点ID_Z IS NULL
    OR TRIM(ts.観点ID_Z) = ''

    OR ts.ケース内容 IS NULL
    OR TRIM(ts.ケース内容) = ''

    OR ts.操作手順 IS NULL
    OR TRIM(ts.操作手順) = ''

    OR ts.確認内容 IS NULL
    OR TRIM(ts.確認内容) = ''

    OR ts.確認手順 IS NULL
    OR TRIM(ts.確認手順) = ''

    OR ts.想定結果 IS NULL
    OR TRIM(ts.想定結果) = ''

    OR ts.想定結果判断基準・判断手順 IS NULL
    OR TRIM(ts.想定結果判断基準・判断手順) = ''

    OR ts.generatorTarget IS NULL
    OR TRIM(ts.generatorTarget) = ''

    OR ts.generatorRule IS NULL
    OR TRIM(ts.generatorRule) = '';