# spreadsheet-like-db-editor - UI Elements

## ConnectionSettingsPage.tsx

### Scope: root（class: なし）｜ 操作対象: 11件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Button |  | トップに戻る | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | 新規作成 | click | navigation_trigger | false | false | false | false |  |  |
| TextField |  | 接続名 | input | text_input | true | false | false | false |  |  |
| TextField |  | ホスト | input | text_input | true | false | false | false |  |  |
| TextField | number | ポート | input | text_input | true | false | false | false |  |  |
| TextField |  | データベース名 | input | text_input | true | false | false | false |  |  |
| TextField |  | ユーザ名 | input | text_input | true | false | false | false |  |  |
| TextField | password | パスワード | input | text_input | true | false | false | false |  |  |
| Button |  | 接続テスト | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | 保存 | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | キャンセル | click | navigation_trigger | false | false | false | false |  |  |

## ExportPage.tsx

### Scope: root（class: なし）｜ 操作対象: 3件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Checkbox |  |  | check | binary_input | false | false | false | false |  |  |
| Checkbox |  |  | check | binary_input | false | false | false | true |  |  |
| Button |  | テーブルを選択してください | click | navigation_trigger | false | false | false | false |  |  |

## ImportPage.tsx

### Scope: root（class: なし）｜ 操作対象: 5件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| input | file |  | input | file_input | false | false | false | false |  |  |
| Select |  |  | input | selection_input | false | false | false | false |  |  |
| TextField |  | 新規テーブル名 | input | text_input | false | false | false | false |  |  |
| Select |  |  | input | selection_input | false | false | false | false |  |  |
| Button |  | アップロード | click | navigation_trigger | false | false | false | false |  |  |

## MappingPage.tsx

### Scope: root（class: なし）｜ 操作対象: 4件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Button |  | 戻る | click | navigation_trigger | false | false | false | false |  |  |
| Select |  |  | input | selection_input | false | false | false | true |  |  |
| Button |  | 戻る | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | カラムをインポート実行 | click | navigation_trigger | false | false | false | false |  |  |

## NewTableMappingPage.tsx

### Scope: root（class: なし）｜ 操作対象: 8件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Button |  | 戻る | click | navigation_trigger | false | false | false | false |  |  |
| TextField |  | テーブル名 | input | text_input | false | false | false | false |  |  |
| Checkbox |  |  | check | binary_input | false | false | false | true |  |  |
| TextField |  |  | input | text_input | false | false | false | true |  |  |
| Select |  |  | input | selection_input | false | false | false | true |  |  |
| Button |  | カラムを追加 | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | 戻る | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | テーブルを作成してインポート実行 | click | navigation_trigger | false | false | false | false |  |  |

## ProcessCompletePage.tsx

### Scope: root（単独要素）

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Button |  | タブを閉じる | click | navigation_trigger | false | false | false | false |  |  |

## TableEditPage.tsx

### Scope: root（class: なし）｜ 操作対象: 4件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Button |  | 行追加 | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | 末尾行削除 | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | キャンセル（編集に戻る） | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | 保存せずに退出 | click | navigation_trigger | false | false | false | false |  |  |

## TopPage.tsx

### Scope: root（class: なし）｜ 操作対象: 3件

| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |
|---|---|---|---|---|---|---|---|---|---|---|
| Button |  | 新規接続設定 | click | navigation_trigger | false | false | false | false |  |  |
| Button |  | 接続 | click | navigation_trigger | false | false | false | true |  |  |
| Button |  | 編集 | click | navigation_trigger | false | false | false | true |  |  |
