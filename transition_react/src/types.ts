// ===================================================
// 型定義
// transition_react で使用する全データ型を定義する
// ===================================================

// RouteDefinitionParser の出力型
// React Router v6 の <Route> 定義から抽出したノード情報
export type NodeInfo = {
  path: string            // 元のpathそのまま（例：/tables/:tableName）
  normalizedPath: string  // ダイナミックセグメント除去後（例：/tables/）
  componentName: string   // コンポーネント名（例：TableEditPage）
}

// TransitionExtractor の出力型
// 各ファイルから抽出した遷移記述の情報
export type EdgeInfo = {
  sourceFile: string      // 遷移記述が存在するファイルパス
  toPath: string          // 遷移先パス
  transitionType: TransitionType
}

export type TransitionType = "navigate" | "location.href" | "Link" | "window.open"

// AdjacencyTableBuilder の出力型
// 遷移元・遷移先のパスとコンポーネント名を解決した隣接テーブルの1行
// 共通コンポーネント（Header等）はfromPathを "__common__" とする
export type AdjacencyRow = {
  fromPath: string        // 遷移元パス（共通コンポーネントは "__common__"）
  fromComponent: string   // 遷移元コンポーネント名
  toPath: string          // 遷移先パス
  toComponent: string     // 遷移先コンポーネント名（未解決は "__unresolved__"）
  sourceFile: string      // 遷移記述が存在するファイルパス
  transitionType: string  // 遷移種別
}

// PathTableBuilder の中間型
// コスト別パステーブルの1行
export type PathRow = {
  cost: number
  fromPath: string
  toPath: string
}

// PathCostClassifier の出力型
// テスト工程区分を付与したパステーブルの1行
export type ClassifiedPathRow = PathRow & {
  testPhase: TestPhase
}

export type TestPhase = "単体テスト" | "結合テスト" | "総合テスト"

// AdjacencyOutputWriter が出力するサマリーの型
export type PathSummary = {
  appName: string
  startPath: string
  maxCost: number
  forward: PhaseCount
  reverse: PhaseCount
  unresolvedPaths: string[]
}

type PhaseCount = {
  total: number
  単体テスト: number
  結合テスト: number
  総合テスト: number
}

// モジュール間の戻り値型
export type ModuleResult<T> = {
  errorCode: number
  data?: T
  message?: string
}
