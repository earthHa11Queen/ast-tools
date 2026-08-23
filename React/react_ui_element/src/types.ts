// ===================================================
// 型定義
// ui_element_react で使用する全データ型を定義する
// ===================================================

// ComponentParser の出力型
export type ComponentInfo = {
  filePath: string
  componentName: string
}

// ElementExtractor の出力型（属性の生データ）
export type RawElement = {
  componentName: string
  filePath: string

  // グループA：基本識別属性（ロケーター特定・一意識別）
  tag: string
  idAttr: string | null
  nameAttr: string | null
  classNameAttr: string | null
  dataTestId: string | null
  typeAttr: string | null
  roleAttr: string | null

  // グループB：ラベル・説明属性
  ariaLabel: string | null
  ariaLabelledBy: string | null   // v1未解決
  htmlFor: string | null          // v1未解決
  placeholder: string | null
  labelProp: string | null        // MUI等のlabel属性
  title: string | null            // ツールチップテキスト

  // グループC：入力制約属性（境界値テスト・テスト仕様書の入力条件定義）
  maxLength: number | null        // 桁的境界値の上限
  minLength: number | null        // 桁的境界値の下限
  maxValue: number | null         // 値的境界値の上限
  minValue: number | null         // 値的境界値の下限
  step: number | null             // 刻み値（境界値テストの単位）
  pattern: string | null          // 正規表現（518のX軸と対応）
  inputMode: string | null        // numeric・email・tel等（518のX軸補助）
  accept: string | null           // file inputの受け入れ種別
  autocomplete: string | null     // 自動補完・IME挙動

  // グループD：画面遷移・フォーム送信属性
  href: string | null             // aタグのリンク先（transition_reactとの照合可）
  target: string | null           // _blank等の新規タブ識別
  formAction: string | null       // button/inputの個別送信先
  formId: string | null           // 所属formのid参照

  // グループE：状態・可視性属性（操作対象外判定・テスト前提条件）
  isRequired: boolean
  isDisabled: boolean
  isReadonly: boolean             // true=Playwright操作対象外候補
  isHidden: boolean               // type=hidden / hidden属性 / aria-hidden=true
  isMultiple: boolean
  isChecked: boolean              // checkbox/radioの静的な初期状態
  defaultValue: string | null     // 静的に取得できる初期値
  tabIndex: number | null         // Tab操作テスト用

  // グループF：アクセシビリティ・インタラクション属性
  ariaExpanded: string | null     // アコーディオン・ドロップダウンの開閉状態
  ariaControls: string | null     // 操作対象のid参照
  ariaHaspopup: string | null     // ポップアップを持つ要素の識別
  ariaSelected: string | null     // タブ・リストボックスの選択状態
  ariaChecked: string | null      // カスタムチェックボックス等の状態

  // グループG：動的生成判定
  isDynamic: boolean              // map/filter/forEach コールバック内

  // グループH：スコープ情報（510のStatic Root対応）
  parentScopeTag: string
  parentScopeClass: string | null
  parentScopeId: string | null    // 親コンテナのid

  // グループI：位置情報
  lineNumber: number
}

// LabelResolver の出力型
export type ResolvedElement = RawElement & {
  labelText: string | null
  labelUnresolved: boolean        // aria-labelledby・htmlFor未解決の場合true
}

// ScopeAnalyzer の出力型（510のStatic Root / Current Scope対応）
export type ScopedElement = ResolvedElement & {
  siblingCount: number            // 同一スコープ内の操作対象要素数
  scopeGroupId: string | null     // siblingCount≥2のスコープ候補に付与するID
}

// MirrorAxisMapper の出力型（最終型）
export type UiElement = ScopedElement & {
  interactionType: InteractionType
  mirrorAxisX: string             // 519のX軸定義ID
  playwrightMethodPrefix: string  // 510の命名規則に従うメソッドプレフィックス
}

export type InteractionType =
  | "text_input"
  | "binary_input"
  | "selection_input"             // selectタグ専用（binary_inputと区別）
  | "file_input"
  | "navigation_trigger"
  | "pseudo_trigger"
  | "unknown"

// モジュール間の戻り値型
export type ModuleResult<T> = {
  errorCode: number
  data?: T
  message?: string
}
