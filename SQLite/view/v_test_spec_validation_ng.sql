CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng AS
SELECT
    ts.CaseNo,
    ts.targetId,
    ts.大分類,
    ts.中分類,
    ts.小分類,
    ts.観点ID_X,
    ts.観点ID_Y,
    ts.観点ID_Z,
    ts.ケース内容,
    ts.操作手順,
    ts.確認内容,
    ts.確認手順,
    ts.想定結果,
    ts.想定結果判断基準・判断手順,
    ts.generatorTarget,
    ts.generatorRule,
    ts.予定日,
    ts.実施日,
    ts.実施者,
    ts.実施結果,
    ts.再実施要否,
    ts.再実施判断日,
    ts.再実施判断担当者,
    ts.再実施テスト仕様書ファイル名ないしファイルパス,
    ts.備考
FROM test_spec ts
JOIN v_test_spec_validation_ng_row ng
    ON ng.validationRowId = ts.rowid;