// ===================================================
// 型定義
// transition_react で使用する全データ型を定義する（v2）
// ===================================================

// ルート定義解析のストラテジー種別
export type RouteSourceStrategy = "jsx" | "object-config" | "file-based"

// RouteDefinitionParser（およびその内部の3ストラテジー）の出力型
// ルート定義から抽出したノード情報
export type NodeInfo = {
  path: string                        // 元のpathそのまま（例：/tables/:tableName）
  normalizedPath: string              // ダイナミックセグメント除去後（例：/tables/）
  componentName: string               // コンポーネント名（例：TableEditPage）
  sourceStrategy: RouteSourceStrategy // どの解析方式で抽出されたノードか（新規・v2）
  hasDynamicSegment: boolean          // 動的セグメント（:xxx等）を含むかどうか（新規・v2）
}

// TransitionExtractor の出力型
// 各ファイルから抽出した遷移記述の情報
export type EdgeInfo = {
  sourceFile: string      // 遷移記述が存在するファイルパス
  toPath: string          // 遷移先パス
  transitionType: TransitionType
}

// "navigate.back" は navigate(-1) のような数値引数（履歴を戻る/進める記法）による遷移を表す（新規・v2）
// 戻り先パスは実行時の履歴スタックに依存するため静的に確定できず、toPathには "__back__" を格納する
export type TransitionType = "navigate" | "location.href" | "Link" | "window.open" | "navigate.back"

// AdjacencyTableBuilder の出力型
// 遷移元・遷移先のパスとコンポーネント名を解決した隣接テーブルの1行
// 共通コンポーネント（Header等）はfromPathを "__common__" とする
export type AdjacencyRow = {
  fromPath: string        // 遷移元パス（共通コンポーネントは "__common__"）
  fromComponent: string   // 遷移元コンポーネント名
  toPath: string          // 遷移先パス（navigate.back由来のエッジは "__back__"）
  // 遷移先コンポーネント名。
  //   "__unresolved__": ルート定義との照合に失敗した（要警告。ルート定義漏れの可能性）
  //   "__back__"（新規・v2）: navigate.back由来のエッジ。行き先はブラウザの実行時履歴に依存し
  //     原理的に確定できないため、意図的に解決を行わない。__unresolved__とは明確に区別する
  toComponent: string
  sourceFile: string      // 遷移記述が存在するファイルパス
  transitionType: string  // 遷移種別
}

// PathTableBuilder の中間型
// コスト別パステーブルの1行
// cost = -1 は、画面数×MAX_PATH_MULTIPLIER の閾値を超えても展開が終了しなかったため、
// 打ち切られたことを示すセンチネル値（新規・v2）。通常のコスト計算では1以上の値しか出現しない。
// CSV出力時のみ "MAX-OVER" という文字列に変換する（AdjacencyOutputWriter内で完結させる）。
export type PathRow = {
  cost: number
  fromPath: string
  toPath: string
  // [新規・v2] 起点から現在地までの累積パス文字列（"｜"区切り）。519のScreenPathカラムに相当する。
  // 例: "/｜/users｜/users/1"
  // 葉（終端画面）に至るこの文字列をSELECT DISTINCT相当で集めることで、
  // 「独立した固有の最長パス」を、木構造の走査を行わずに抽出できる
  path: string
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

// Tier区分（新規・v2）
export type Tier = "tier1" | "tier2"

// TierClassifier の出力型（新規・v2）
// 画面ごとの到達性判定結果
export type ReachabilityRow = {
  screenComponent: string
  tier: Tier
  url: string | null              // tier1の場合の相対パス（動的セグメントを含む場合はそのまま格納し、
                                   // hasDynamicSegmentで人手入力要否を判定できるようにする）
  hasDynamicSegment: boolean
  viaPath: string[] | null        // tier2の場合の経由コンポーネント名列（起点含む）
  viaPathCost: number | null      // tier2の場合の経由パスのコスト（ホップ数）
  sourceStrategy: RouteSourceStrategy | null
  // [新規・v2] viaPathが「独立した固有の最長パス」由来の場合、同じ最長パスを共有する
  // 画面同士で共通の識別子を持つ。BFSフォールバックで個別算出された場合はnull。
  // モジュールB（dom_capture_gen）が、同じ経路を共有する画面群を1本の共通スクリプトに
  // まとめる際の手がかりとして使う
  pathGroupId: string | null
}

// モジュール間の戻り値型
export type ModuleResult<T> = {
  errorCode: number
  data?: T
  message?: string
}
