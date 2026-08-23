CREATE TABLE IF NOT EXISTS test_spec (
    CaseNo TEXT PRIMARY KEY,

    targetId TEXT NOT NULL,

    大分類 TEXT NOT NULL DEFAULT '-',
    中分類 TEXT NOT NULL DEFAULT '-',
    小分類 TEXT NOT NULL DEFAULT '-',

    観点ID_X TEXT NOT NULL DEFAULT '-',
    観点ID_Y TEXT NOT NULL DEFAULT '-',
    観点ID_Z TEXT NOT NULL DEFAULT '-',

    ケース内容 TEXT NOT NULL DEFAULT '-',
    操作手順 TEXT NOT NULL DEFAULT '-',
    確認内容 TEXT NOT NULL DEFAULT '-',
    確認手順 TEXT NOT NULL DEFAULT '-',
    想定結果 TEXT NOT NULL DEFAULT '-',
    "想定結果判断基準・判断手順" TEXT NOT NULL DEFAULT '-',

    generatorTarget TEXT NOT NULL,
    generatorRule TEXT NOT NULL,

    予定日 TEXT NOT NULL DEFAULT '-',
    実施日 TEXT NOT NULL DEFAULT '-',
    実施者 TEXT NOT NULL DEFAULT '-',
    実施結果 TEXT NOT NULL DEFAULT '-',

    再実施要否 TEXT NOT NULL DEFAULT '-',
    再実施判断日 TEXT NOT NULL DEFAULT '-',
    再実施判断担当者 TEXT NOT NULL DEFAULT '-',
    再実施テスト仕様書ファイル名ないしファイルパス TEXT NOT NULL DEFAULT '-',

    備考 TEXT NOT NULL DEFAULT '-',

    CHECK (
        generatorTarget = targetId
    ),

    CHECK (
        generatorRule =
            'X='
            || 観点ID_X
            || '|Y='
            || 観点ID_Y
            || '|Z='
            || 観点ID_Z
    )
);