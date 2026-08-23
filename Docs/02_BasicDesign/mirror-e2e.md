# 519.鏡の原理E2E-画面遷移拡張

## 連結・総合テストへの拡張（2026/03/26追記）

以下のようなことを業務中に思い付いたため、ひとまずメモ。

- 現在、Playwright のコーディングにおいて、連結テスト工程のテストを作成している。
- 鏡の原理は単体テストには強いが、連結テストにおいては未検証かつ少し弱い気が以前からしている。なぜなら連結における要素の1つ｢操作｣と｢遷移｣においては演算可能としておらず、プロンプト頼りにしてあるからだ。
- しかし、改めて考えると画面遷移というのは所詮｢ネットワークの最短経路問題｣と同じ解法で解決するはずだと改めて気づいた。
- 過去に私が開発した光ネットワーク経路設計-MicrosoftACCESSアプリは、空港で働いているときに作成したものだが、このロジックを転用するだけでほぼアーキテクチャとしては行けるはず。これは光ケーブルが収納されている空港内のEPS(たしか400以上あった気がする)に意味の無い1001のようなIDを割り振りつつ、テーブルとしてEPSIDと隣接するEPSIDをそれそれ列としたものを用意しておき、それをひたすらLeft Joinで繋げていくようなSQLを作成した。そしてこのJoin回数=パスコストとなることは自明の理であるし、隣接するIDがなくなったとき=SelectされずNull行がLeft Joinされていく。これにより最長のパスコストを目視で確認した上で、MAXのEPS経路がわかる。そしてこれは物理的に変更が容易ではないため、基本的に変わらないと要件でわかっているため、一度の最長経路が分かれば向こう十年くらいは変わらない。また、Null行が現れる=その前までのIDの羅列が経路となるため、その経路の内IDの数がいくつかでパスコストが簡単にかつSQLで算出できた。
- これを用いれば、画面遷移における次の画面さえ分かれば、EPSのときよりは確実に少ない経路パターンが現れるはずだ。
- また、戻るボタンなような逆行の遷移も戻れる次の画面遷移が分かればいいだけなので、これも経路パターンとして有限かつ少数で現せる。
- 問題はこの戻るボタンや次へボタンといったものを、どうやって具体的なWebアプリを前提と｢せずに｣抽象化および極一般化するかだ。
- これに対しても業務中に簡単だなと思った。つまるところHTMLでしか操作はできないので、inputやaタグといったものを網羅すればいいだけである。つまり操作の限界=ドメインはHTMLに完全依存であるため、遷移においては有限かつ少数であると思った。
- そして操作の網羅性についても、JavaScriptはどうするか？となるんだが、これも結局DOM操作=HTML依存なので、JavaScriptはHTML操作の手段でしかない。ゆえにHTMLだけみれば、人間の操作可能なドメインは有限かつコントロール可能なドメインに落ち着くはずだ。
- これにより連結および総合テストの静的なテストケース算出が可能になったと思われる。

## 隣接テーブルの考え方

### 参考：光ネットワーク経路設計を応用した画面経路を計算する場合のテーブル例

| ScreenID | NextScreen |
| -------- | ---------- |
| 1001     | 1002       |
| 1001     | 1003       |
| 1002     | 1004       |
| 1003     | 1005       |
| 1004     | 1006       |
| 1005     | ENDSCREEN  |
| 1006     | 1007       |
| 1007     | 1005       |

なお、このテーブルは画面一覧と画面遷移図ないし概念設計書や要件定義書などから作成できるし、この一覧を元に画面遷移図をマーメイドで生成してもよいと思う。
特に上記は順行のみを記載している前提だが、戻るボタンの逆行は逆行用テーブルを用意しIDも頭を2など変えたりすれば別遷移データとなる。画面一覧の画面IDをベースにしているので、ID操作は画面IDを正とすれば問題なく整合性が取れる。
特殊な画面引き継ぎがある場合も粒度をその遷移内に留めることで少量のデータ数で表現できるから、逆行とやっていることはほぼ同じで可能と考える。

また、以下はLeft Joinと同じ処理で作るテーブルである。

| ScreenID | ScreenPath                              | PathCost |
| -------- | --------------------------------------- | -------- |
| 1001     | 1001/1002/1004/1006/1007/1005/ENDSCREEN | 5        |
| 1001     | 1001/1003/1005/ENDSCREEN                | 2        |
| 中略     |                                         |          |
| 1005     | 1005/ENDSCREEN                          | 0        |
| 1006     | 1006/1007/1005/ENDSCREEN                | 2        |
| 1007     | 1007/1005/ENDSCREEN                     | 1        |

- このようにすればスクリプトでも作成しやすいし、スクリプトでこのテーブルを利用することも考えていける。
- 特にパスコスト列は次のように考えられる。
  - コスト0=単体テスト対象パス
  - コスト1~最大値=連結テスト対象パス
  - コスト最大値=総合テスト対象パス
- なお、コスト最大値はおそらく普通の業務アプリなら数種類存在するため、実際に取り出すときはコスト+画面IDの組み合わせで取り出したときのコスト最大値としなければならず、かつ0ではないものとして取り出す必要がある。
- つまり、テスト工程の数値的な判定や取り出しによって、よりテストケースの総数計算が容易になる。なぜなら単体テスト仕様書生成時点で、テストが必要な画面項目数やテスト数は算出済みなので、後は単なる足し算とかけ算になるからだ。
- もっと言えば単体テストを生成している段階で、AIに総数とケース数を表すテーブルを作らせつつ追記させて行けば、ここら辺の作業が楽になる。

## 実際の設計書から作成した隣接テーブル

### 順行（Forward）の画面遷移テーブル

| ScreenID | NextScreen  |
|----------|-------------|
| S01      |   S02       |
| S01      |   S03       |
| S03      |   S03       |
| S03      |   S04       |
| S03      |   S06       |
| S03      |   C04       |
| S03      |   C06       |
| S03      |   C07       |
| S03      |   C08       |
| S03      |   C09       |
| S04      |   S05       |
| S05      |   S07       |
| S06      |   S07       |
| S07      |   ENDSCREEN |
| C04      |   C05       |
| C06      |   ENDSCREEN |

### 逆行（Backward）の画面遷移テーブル

| ScreenID | NextScreen |
|----------|------------|
| S02      |    S01     |
| C04      |    S03     |
| C05      |    C04     |
| C06      |    S03     |
| C07      |    S03     |
| C08      |    S03     |
| C09      |    S03     |


以下は具体的な鏡の原理における連結・総合拡張用のYAMLであり、これを鏡の原理E2Eとして利用する際のその本体である。

```yaml


# ==============================================================================
# The Mirror Framework: E2E Transition Definition Schema
# Version: 1.0.0
# Description: 3-Dimensional Definition for E2E Test Generation based on Set Theory
# ==============================================================================

# ------------------------------------------------------------------------------
# [X-Axis] Target DOM Elements (Physical Node Domain)
# 数学的定義: ∀x ∈ X, x is a bounded interactable node in the DOM tree.
# ------------------------------------------------------------------------------
x_axis:
  definition: "操作の対象となる物理的なHTML要素の完全集合"
  hierarchy:
    - id: navigation_triggers
      name: "コンテキスト移動トリガー (Navigation Nodes)"
      subsets:
        - id: anchor_link
          name: "アンカーリンク"
          tag: "a"
          attribute: "href"
        - id: button_submit
          name: "送信ボタン"
          tag: "button"
          attribute: "type='submit'"
        - id: button_reset
          name: "リセットボタン"
          tag: "button"
          attribute: "type='reset'"
        - id: button_normal
          name: "汎用ボタン"
          tag: "button"
          attribute: "type='button'"
        - id: input_submit
          name: "送信インプット"
          tag: "input"
          attribute: "type='submit'"
        - id: input_image
          name: "画像送信インプット"
          tag: "input"
          attribute: "type='image'"

    - id: state_mutators
      name: "状態・ペイロード保持要素 (State Mutator Nodes)"
      subsets:
        - id: text_input_group
          name: "テキスト入力系"
          subsets:
            - id: input_text
              name: "単一テキスト"
              tag: "input"
              attribute: "type='text'"
            - id: input_password
              name: "パスワード"
              tag: "input"
              attribute: "type='password'"
            - id: input_email
              name: "メールアドレス"
              tag: "input"
              attribute: "type='email'"
            - id: input_number
              name: "数値"
              tag: "input"
              attribute: "type='number'"
            - id: input_tel
              name: "電話番号"
              tag: "input"
              attribute: "type='tel'"
            - id: input_url
              name: "URL"
              tag: "input"
              attribute: "type='url'"
            - id: input_search
              name: "検索クエリ"
              tag: "input"
              attribute: "type='search'"
            - id: textarea_multiline
              name: "複数行テキスト"
              tag: "textarea"
              attribute: "none"
        - id: binary_input_group
          name: "真偽・選択系"
          subsets:
            - id: input_checkbox
              name: "チェックボックス (複数選択可)"
              tag: "input"
              attribute: "type='checkbox'"
            - id: input_radio
              name: "ラジオボタン (排他選択)"
              tag: "input"
              attribute: "type='radio'"
            - id: select_single
              name: "単一選択ドロップダウン"
              tag: "select"
              attribute: "none"
            - id: select_multiple
              name: "複数選択リストボックス"
              tag: "select"
              attribute: "multiple"
        - id: file_input_group
          name: "ファイル操作系"
          subsets:
            - id: input_file_single
              name: "単一ファイル選択"
              tag: "input"
              attribute: "type='file'"
            - id: input_file_multiple
              name: "複数ファイル選択"
              tag: "input"
              attribute: "type='file' and multiple"

    - id: pseudo_triggers
      name: "JS駆動型トリガー (Semantic / ARIA Nodes)"
      subsets:
        - id: div_button
          name: "Div疑似ボタン"
          tag: "div"
          attribute: "role='button'"
        - id: span_button
          name: "Span疑似ボタン"
          tag: "span"
          attribute: "role='button'"
        - id: i_icon_button
          name: "Icon疑似ボタン"
          tag: "i"
          attribute: "role='button'"

# ------------------------------------------------------------------------------
# [Y-Axis] Physical Interactions (Action Domain)
# 数学的定義: ∀y ∈ Y, y is a physical device interrupt applied to x.
# ------------------------------------------------------------------------------
y_axis:
  definition: "人間が物理デバイスを通じて行う具体的操作の完全集合"
  hierarchy:
    - id: pointing_device
      name: "ポインティングデバイス操作 (Pointer Events)"
      subsets:
        - id: click_primary
          name: "左クリック"
        - id: click_secondary
          name: "右クリック"
        - id: click_middle
          name: "ミドルクリック (ホイールクリック)"
        - id: click_double
          name: "ダブルクリック"
        - id: hover_enter
          name: "ホバー進入"
        - id: hover_leave
          name: "ホバー離脱"
        - id: drag_start
          name: "ドラッグ開始"
        - id: drag_move
          name: "ドラッグ移動"
        - id: drop_release
          name: "ドロップ解放"

    - id: keyboard_device
      name: "キーボード操作 (Keyboard Events)"
      subsets:
        - id: data_stream
          name: "データストリーム生成"
          subsets:
            - id: type_char_direct
              name: "直接打鍵 (IME Off)"
            - id: type_char_ime
              name: "変換打鍵 (IME On -> 確定)"
            - id: paste_clipboard
              name: "クリップボード貼付 (Ctrl+V)"
        - id: data_deletion
          name: "データ破棄"
          subsets:
            - id: delete_backspace_single
              name: "後方単一削除 (Backspace)"
            - id: delete_forward_single
              name: "前方単一削除 (Delete)"
            - id: delete_continuous
              name: "連続削除 (長押し)"
            - id: delete_all_overwrite
              name: "全選択上書き (Ctrl+A -> Type)"
        - id: control_signals
          name: "制御シグナル"
          subsets:
            - id: press_enter
              name: "Enterキー打鍵"
            - id: press_escape
              name: "Escapeキー打鍵"
            - id: press_tab_forward
              name: "Tabキー打鍵 (順行フォーカス)"
            - id: press_tab_backward
              name: "Shift+Tabキー打鍵 (逆行フォーカス)"
            - id: press_space
              name: "Spaceキー打鍵"
            - id: press_arrow_up
              name: "上矢印キー打鍵"
            - id: press_arrow_down
              name: "下矢印キー打鍵"

# ------------------------------------------------------------------------------
# [Z-Axis] Transition Topology (State Change Domain)
# 数学的定義: z = f(x, y), where f is defined by the Screen Definition Document.
# ------------------------------------------------------------------------------
z_axis:
  definition: "XとYの適用により生じる、UIトポロジー上の状態遷移の形態"
  hierarchy:
    - id: context_shift
      name: "コンテキストの完全移動 (Macro Transition)"
      subsets:
        - id: navigation_get
          name: "データ非保持遷移 (Link Navigation)"
        - id: navigation_post_success
          name: "データ保持遷移・成功 (Submit -> Next Screen)"
        - id: navigation_post_failure
          name: "データ保持遷移・失敗 (Submit -> Same Screen with Errors)"
        - id: navigation_back
          name: "履歴逆行遷移 (Browser Back)"

    - id: layer_overlay
      name: "レイヤーの重畳 (Micro Transition - Z-Index)"
      subsets:
        - id: modal_open
          name: "モーダル/ダイアログ展開"
        - id: modal_close
          name: "モーダル/ダイアログ閉鎖"
        - id: popup_window_open
          name: "別ウィンドウ展開 (target='_blank')"

    - id: native_interrupt
      name: "ネイティブ割り込み (Browser Native API)"
      subsets:
        - id: native_alert
          name: "Alertダイアログ発生"
        - id: native_confirm
          name: "Confirmダイアログ発生"
        - id: native_file_picker
          name: "OSファイルピッカー起動"

    - id: visibility_toggle
      name: "可視性の反転 (Micro Transition - Display)"
      subsets:
        - id: element_expand
          name: "要素の展開 (アコーディオン開)"
        - id: element_collapse
          name: "要素の折畳 (アコーディオン閉)"
        - id: tooltip_show
          name: "ツールチップ/ポップオーバー表示"
        - id: tooltip_hide
          name: "ツールチップ/ポップオーバー非表示"

    - id: dom_state_mutation
      name: "DOM状態の変異 (Micro Transition - State)"
      subsets:
        - id: value_update
          name: "Value属性の更新"
        - id: checked_state_toggle
          name: "Checked状態の反転"
        - id: focus_shift
          name: "Focus状態の移動"
        - id: async_fetch_trigger
          name: "非同期通信の発火 (AJAX/Fetch等による部分更新)"



```
