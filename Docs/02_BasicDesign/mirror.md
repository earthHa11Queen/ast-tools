# 518.鏡の原理-入力値パターンカタログ

入力値(ひとまずインジェクション系は外して考慮分類する)

- 数値
  - 数値系
    - 整数
      - 値的境界値
      - 桁的境界値
      - 値的同値
      - 桁的同値
      - プラス符号値
      - マイナス符号値
      - 日付数字
      - TRUE
      - FALSE
    - 小数
      - 小数限定値的境界値
      - 小数限定桁的境界値
      - 小数限定値的同値
      - 小数限定桁的同値
      - 小数限定プラス符号値
      - 小数限定マイナス符号値
      - 整数混合値的境界値
      - 整数混合桁的境界値
      - 整数混合値的同値
      - 整数混合桁的同値
      - 整数混合プラス符号値
      - 整数混合マイナス符号値
  - 文字列系
    - 同値的整数文字列
    - 同値的小数文字列
    - 同値的整数混合小数文字列
    - 境界値的整数文字列
    - 境界値的小数文字列
    - 境界値的整数混合小数文字列
    - TRUE文字列
    - FALSE文字列
    - 同値的日付数字文字列
  - 日付系
    - 年月日
    - 年月日時間分数
    - 年月日時間分数秒数
    - 年月日時間分数秒数ミリ秒数
    - 年月日時間分数秒数タイムゾーン
    - 年月日時間分数秒数ミリ秒数タイムゾーン
    - 時間分数
    - 時間分数秒数
    - 時間分数秒数ミリ秒数
    - 時間分数秒数タイムゾーン
    - 時間分数秒数ミリ秒数タイムゾーン
    - 閏年
    - 存在しない日付
    - 存在しない日付+正常時間分数
    - 存在しない日付+正常時間分数秒数
    - 存在しない日付+正常時間分数秒数ミリ秒数
    - 存在しない日付+存在しない時間分数
    - 存在しない日付+存在しない時間分数秒数
    - 存在しない日付+存在しない時間分数秒数ミリ秒数
    - 存在しない日付+正常時間分数タイムゾーン
    - 存在しない日付+正常時間分数秒数タイムゾーン
    - 存在しない日付+正常時間分数秒数ミリ秒数タイムゾーン
    - 存在しない日付+存在しない時間分数タイムゾーン
    - 存在しない日付+存在しない時間分数秒数タイムゾーン
    - 存在しない日付+存在しない時間分数秒数ミリ秒数タイムゾーン

- 文字列
  - 文字列系
    - 桁的同値文字列
    - 桁的境界値文字列
    - 半角英数カタカナ記号文字
    - 全角英数文字
    - 全角英数漢字ひらがなカタカナ記号文字
    - 半角英数文字限定
    - 半角英数記号限定
    - 全角ひらがな限定
    - 全角カタカナ限定
    - 全角漢字限定
    - 半角カタカナ限定
    - 半角ひらがな限定
    - 髙などの漢字
    - 選択肢範囲内文字列
    - 選択肢範囲外文字列
    - 選択肢範囲内コード値
    - 選択肢範囲外コード値
    - TRUE文字列
    - FALSE文字列
  - 数値系
    - 符号無し整数文字列
    - プラス符号整数値文字列
    - マイナス符号整数値文字列
    - 数値のみ文字列
    - 1+2などの演算式文字列
    - 符号無し小数文字列
    - プラス符号小数文字列
    - マイナス符号小数文字列
    - 符号無し整数混合小数文字列
    - プラス符号整数混合小数文字列
    - マイナス符号整数混合小数文字列
    - ハイフン有り電話番号
    - ハイフン無し電話番号
    - 存在しない電話番号パターン
    - ハイフン有り郵便番号
    - ハイフン無し郵便番号
    - 存在しない郵便番号パターン
  - 日付系
    - 年月日
    - 年月日時間分数
    - 年月日時間分数秒数
    - 年月日時間分数秒数ミリ秒数
    - 年月日時間分数秒数タイムゾーン
    - 年月日時間分数秒数ミリ秒数タイムゾーン
    - 時間分数
    - 時間分数秒数
    - 時間分数秒数ミリ秒数
    - 時間分数秒数タイムゾーン
    - 時間分数秒数ミリ秒数タイムゾーン
    - 閏年
    - 存在しない日付
    - 存在しない日付+正常時間分数
    - 存在しない日付+正常時間分数秒数
    - 存在しない日付+正常時間分数秒数ミリ秒数
    - 存在しない日付+存在しない時間分数
    - 存在しない日付+存在しない時間分数秒数
    - 存在しない日付+存在しない時間分数秒数ミリ秒数
    - 存在しない日付+正常時間分数タイムゾーン
    - 存在しない日付+正常時間分数秒数タイムゾーン
    - 存在しない日付+正常時間分数秒数ミリ秒数タイムゾーン
    - 存在しない日付+存在しない時間分数タイムゾーン
    - 存在しない日付+存在しない時間分数秒数タイムゾーン
    - 存在しない日付+存在しない時間分数秒数ミリ秒数タイムゾーン

以下は具体的なYAMLであり、これを鏡の原理として利用するその本体である。

```yaml


# ==============================================================================
# The Mirror Framework: Test Data Definition Schema
# Version: 1.0.0
# Description: 3-Dimensional Definition for Test Generation based on Set Theory
# ==============================================================================

# ------------------------------------------------------------------------------
# [Y-Axis] Quantity & Length (Range Domain)
# 数学的定義: len(i) ∈ Ry
# ------------------------------------------------------------------------------
y_axis:
  definition: "入力値の物理的な長さ（桁数・バイト数）および数量の範囲"
  domains:
    - id: length_null
      name: "Null/未入力"
      logic: "len == 0 (if nullable)"
    - id: length_empty
      name: "空文字"
      logic: "len == 0 (if not nullable)"
    - id: length_min
      name: "最小桁"
      logic: "len == min"
    - id: length_min_minus_1
      name: "最小桁未満 (Underflow)"
      logic: "len == min - 1"
    - id: length_max
      name: "最大桁"
      logic: "len == max"
    - id: length_max_plus_1
      name: "最大桁超過 (Overflow)"
      logic: "len == max + 1"
    - id: length_normal_mid
      name: "中間値"
      logic: "min < len < max"

# ------------------------------------------------------------------------------
# [X-Axis] Physical Character Type (Subset Domain)
# 数学的定義: ∀c ∈ i, c ∈ Dx (インデントが深いほど集合が狭い)
# ------------------------------------------------------------------------------
x_axis:
  definition: "入力値を構成する文字コード・物理的な文字種の集合"
  hierarchy:
    - id: string_root
      name: "文字列 (Universal String Set)"
      subsets:
        # --- 全角集合 (Full-width Set) ---
        - id: full_width
          name: "全角"
          subsets:
            - id: fw_date_time
              name: "日付・日時関連"
              subsets:
                - id: fw_date
                  name: "全角日付"
                - id: fw_datetime
                  name: "全角日時"
                - id: fw_datetime_tz
                  name: "全角日時タイムゾーン"
            - id: fw_text
              name: "全角テキスト"
              subsets:
                - id: fw_alphanum
                  name: "全角英数"
                  subsets:
                    - id: fw_alpha
                      name: "全角英字"
                    - id: fw_numeric_char
                      name: "全角数字 (文字)"
                - id: fw_kana
                  name: "全角カナ"
                  subsets:
                    - id: fw_katakana
                      name: "全角カタカナ"
                    - id: fw_hiragana
                      name: "全角ひらがな"
                - id: fw_symbol
                  name: "全角記号"
                - id: fw_kanji
                  name: "漢字"
                  subsets:
                    - id: fw_kanji_common
                      name: "全角常用漢字"
                    - id: fw_kanji_variant
                      name: "全角異体字"
            - id: fw_numeric_value
              name: "全角数値 (値として解釈可能)"
              subsets:
                - id: fw_decimal_system
                  name: "10進数"
                  subsets:
                    - id: fw_integer
                      name: "整数"
                    - id: fw_float
                      name: "小数"
                - id: fw_binary
                  name: "2進数"
                - id: fw_octal
                  name: "8進数"
                - id: fw_hex
                  name: "16進数"
            - id: fw_special
              name: "特殊全角"
              subsets:
                - id: fw_bool
                  name: "TRUE/FALSE"
                - id: fw_env_dependent
                  name: "環境依存文字"
                - id: fw_emoji
                  name: "絵文字"
                - id: fw_space
                  name: "全角空白"
                - id: fw_surrogate
                  name: "サロゲートペア (4byte)"

        # --- 半角集合 (Half-width Set) ---
        - id: half_width
          name: "半角"
          subsets:
            - id: hw_date_time
              name: "日付・日時関連"
              subsets:
                - id: hw_date
                  name: "半角日付"
                - id: hw_datetime
                  name: "半角日時"
                - id: hw_datetime_tz
                  name: "半角日時タイムゾーン"
            - id: hw_text
              name: "半角テキスト"
              subsets:
                - id: hw_alphanum
                  name: "半角英数"
                  subsets:
                    - id: hw_alpha
                      name: "半角英字"
                    - id: hw_numeric_char
                      name: "半角数字 (文字)"
                - id: hw_kana
                  name: "半角カナ"
                  subsets:
                    - id: hw_katakana
                      name: "半角カタカナ"
                    - id: hw_hiragana
                      name: "半角ひらがな"
                - id: hw_symbol
                  name: "半角記号"
            - id: hw_numeric_value
              name: "半角数値 (値として解釈可能)"
              subsets:
                - id: hw_decimal_system
                  name: "10進数"
                  subsets:
                    - id: hw_integer
                      name: "整数"
                    - id: hw_float
                      name: "小数"
                - id: hw_binary
                  name: "2進数"
                - id: hw_octal
                  name: "8進数"
                - id: hw_hex
                  name: "16進数"
            - id: hw_special
              name: "特殊半角"
              subsets:
                - id: hw_bool
                  name: "TRUE/FALSE"
                - id: hw_space
                  name: "半角空白"

# ------------------------------------------------------------------------------
# [Z-Axis] Semantic & Pattern (Predicate Domain)
# 数学的定義: Pz(i) is True
# ------------------------------------------------------------------------------
z_axis:
  definition: "入力値の意味、文脈、構造的パターン、および意地悪な境界条件"
  categories:
    # --- 1. 基本データ型 (Primitives) ---
    - category: primitives
      name: "基本データ型"
      patterns:
        - group: string_concepts
          name: "文字列概念"
          items:
            - id: unified_width
              name: "幅の統一性"
              variants: [半角のみ, 全角のみ]
            - id: unified_type
              name: "文字種の統一性"
              variants: [英字のみ, 数字のみ, 記号のみ]
            - id: mixed_pattern
              name: "混合パターン"
              variants: [半角全角混合, 英数混合, カオス混合]
        
        - group: numeric_concepts
          name: "数値概念"
          items:
            - id: values
              name: "値の性質 (Integer/Decimal型)"
              variants:
                - 整数 (正, 負, ゼロ)
                - 小数 (正, 負, 循環小数)
            - id: representations
              name: "表記の性質 (String型)"
              variants:
                - ゼロ埋め (有り, 無し)
                - 符号明記 (プラス付き, マイナス付き)
                - 指数表記
                - カンマ区切り

    # --- 2. 構造化データ (Structured) ---
    - category: structured
      name: "構造化データ・フォーマット"
      patterns:
        - group: datetime
          name: "日付・時刻"
          items:
            - id: logical_validity
              name: "論理的妥当性"
              variants: [存在する値, 存在しない値(13月等), うるう年]
            - id: system_range
              name: "システム範囲"
              variants: [有効範囲内, 範囲外(1900年以前等)]
            - id: datetime_format
              name: "表記フォーマット"
              variants: [ゼロ埋め有無, タイムゾーン有無]
            - id: serial_values
              name: "シリアル値"
              variants:
                - Unix Timestamp (秒/ミリ秒/マイナス/32bit境界)
                - Excel Serial (整数/小数/負/1900年2月29日バグ)
        
        - group: fixed_format
          name: "固定フォーマット"
          items:
            - id: email
              name: "メールアドレス"
              variants: [@半角, @全角, ドメイン不備]
            - id: phone
              name: "電話番号"
              variants: [ハイフン有無, 桁数不足]
            - id: postal
              name: "郵便番号"
              variants: [ハイフン有無]

        - group: enum
          name: "選択肢・コード"
          items:
            - id: code_validity
              name: "コード値妥当性"
              variants: [定義内, 定義外]

    # --- 3. 技術的エッジケース (Technical) ---
    - category: technical
      name: "特殊・技術的パターン"
      patterns:
        - group: special_chars
          name: "特殊文字・空白"
          variants: [各種空白, 改行コード(CR/LF), タブ, 制御文字(NULL)]
        
        - group: encoding
          name: "マッピング・エンコード"
          variants: [サロゲートペア, 環境依存文字, マッピング差異文字]
        
        - group: injection
          name: "インジェクション攻撃"
          variants: [SQL, OSコマンド, HTML/Script, 数式(=1+1)]
        
        - group: error_values
          name: "エラー値・Null"
          variants: [DB_NULL, String_"null", Empty, Undefined]

    # --- 4. 相対境界 (Relative Boundaries) ---
    - category: relative_boundaries
      name: "相対的境界値 (動的生成用)"
      patterns:
        - group: dynamic_range
          name: "動的範囲"
          variants:
            - 最小値 (Min)
            - 最小値-1 (Underflow)
            - 最大値 (Max)
            - 最大値+1 (Overflow)
            - 中間値 (Normal)
        - group: numeric_limit
          name: "数値制限"
          variants:
            - 許容最大値
            - 許容最大値+1
            - 許容最小値
            - 許容最小値-1

```
