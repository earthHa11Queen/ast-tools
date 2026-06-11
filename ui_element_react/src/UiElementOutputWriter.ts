import * as fs from "fs"
import * as path from "path"
import type { UiElement, ModuleResult } from "./types"
import {
  UI_ELEMENTS_JSON_FILENAME,
  ADJACENCY_CSV_FILENAME,
  UI_ELEMENTS_MD_FILENAME,
} from "../config"

// ===================================================
// UiElementOutputWriter
// UiElement[] を JSON / CSV / Markdown で出力する
//
// CSVカラム順（左=必須・重要、右=補助・参考）：
//   A: 識別・位置（screenName・lineNumber・tag・id・name等）
//   B: ラベル
//   C: 入力制約（境界値テスト用）
//   D: 遷移・送信
//   E: 状態・可視性
//   F: アクセシビリティ
//   G: 動的生成・スコープ
//   H: Playwright連携
// ===================================================

const BOM = "\uFEFF"

// CSV用エスケープ
function esc(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// 全カラムの定義（ヘッダー名 → RawElement のキー）
const CSV_COLUMNS: { header: string; key: keyof UiElement | ((el: UiElement) => string) }[] = [
  // グループA：基本識別属性
  { header: "screenName",           key: "componentName"    },
  { header: "lineNumber",           key: "lineNumber"       },
  { header: "tag",                  key: "tag"              },
  { header: "idAttr",               key: "idAttr"           },
  { header: "nameAttr",             key: "nameAttr"         },
  { header: "classNameAttr",        key: "classNameAttr"    },
  { header: "dataTestId",           key: "dataTestId"       },
  { header: "typeAttr",             key: "typeAttr"         },
  { header: "roleAttr",             key: "roleAttr"         },

  // グループB：ラベル
  { header: "labelText",            key: "labelText"        },
  { header: "labelUnresolved",      key: "labelUnresolved"  },
  { header: "placeholder",          key: "placeholder"      },
  { header: "title",                key: "title"            },
  { header: "ariaLabel",            key: "ariaLabel"        },
  { header: "ariaLabelledBy",       key: "ariaLabelledBy"   },
  { header: "htmlFor",              key: "htmlFor"          },
  { header: "labelProp",            key: "labelProp"        },

  // グループC：入力制約
  { header: "maxLength",            key: "maxLength"        },
  { header: "minLength",            key: "minLength"        },
  { header: "maxValue",             key: "maxValue"         },
  { header: "minValue",             key: "minValue"         },
  { header: "step",                 key: "step"             },
  { header: "pattern",              key: "pattern"          },
  { header: "inputMode",            key: "inputMode"        },
  { header: "accept",               key: "accept"           },
  { header: "autocomplete",         key: "autocomplete"     },

  // グループD：遷移・送信
  { header: "href",                 key: "href"             },
  { header: "target",               key: "target"           },
  { header: "formAction",           key: "formAction"       },
  { header: "formId",               key: "formId"           },

  // グループE：状態
  { header: "isRequired",           key: "isRequired"       },
  { header: "isDisabled",           key: "isDisabled"       },
  { header: "isReadonly",           key: "isReadonly"       },
  { header: "isHidden",             key: "isHidden"         },
  { header: "isMultiple",           key: "isMultiple"       },
  { header: "isChecked",            key: "isChecked"        },
  { header: "defaultValue",         key: "defaultValue"     },
  { header: "tabIndex",             key: "tabIndex"         },

  // グループF：アクセシビリティ
  { header: "ariaExpanded",         key: "ariaExpanded"     },
  { header: "ariaControls",         key: "ariaControls"     },
  { header: "ariaHaspopup",         key: "ariaHaspopup"     },
  { header: "ariaSelected",         key: "ariaSelected"     },
  { header: "ariaChecked",          key: "ariaChecked"      },

  // グループG：動的生成・スコープ
  { header: "isDynamic",            key: "isDynamic"        },
  { header: "parentScopeTag",       key: "parentScopeTag"   },
  { header: "parentScopeClass",     key: "parentScopeClass" },
  { header: "parentScopeId",        key: "parentScopeId"    },
  { header: "siblingCount",         key: "siblingCount"     },
  { header: "scopeGroupId",         key: "scopeGroupId"     },

  // グループH：Playwright連携
  { header: "interactionType",      key: "interactionType"  },
  { header: "mirrorAxisX",          key: "mirrorAxisX"      },
  { header: "playwrightMethodPrefix", key: "playwrightMethodPrefix" },
]

export class UiElementOutputWriter {

  write(
    outputDir: string,
    appName: string,
    elementsMap: Map<string, UiElement[]>
  ): ModuleResult<void> {

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
    } catch (e) {
      return { errorCode: 1, message: `出力ディレクトリの作成に失敗しました: ${e}` }
    }

    // --- JSON ---
    const jsonResult = this.writeJson(outputDir, appName, elementsMap)
    if (jsonResult.errorCode !== 0) return jsonResult

    // --- CSV ---
    const csvResult = this.writeCsv(outputDir, elementsMap)
    if (csvResult.errorCode !== 0) return csvResult

    // --- Markdown ---
    const mdResult = this.writeMarkdown(outputDir, appName, elementsMap)
    if (mdResult.errorCode !== 0) return mdResult

    console.log(`出力完了: ${outputDir}`)
    return { errorCode: 0 }
  }

  // JSON出力：コンポーネント名をキーとするオブジェクト
  // filePathはローカルパスを含むため、ファイル名のみに正規化する
  private writeJson(
    outputDir: string,
    appName: string,
    elementsMap: Map<string, UiElement[]>
  ): ModuleResult<void> {
    try {
      const obj: Record<string, unknown> = { appName, screens: {} }
      for (const [name, elements] of elementsMap) {
        const normalized = elements.map((el) => ({
          ...el,
          filePath: path.basename(el.filePath),
        }))
        ;(obj.screens as Record<string, unknown>)[name] = normalized
      }
      fs.writeFileSync(
        path.join(outputDir, UI_ELEMENTS_JSON_FILENAME),
        JSON.stringify(obj, null, 2),
        "utf-8"
      )
      const total = [...elementsMap.values()].reduce((s, a) => s + a.length, 0)
      console.log(`  ${UI_ELEMENTS_JSON_FILENAME}: ${total}件`)
      return { errorCode: 0 }
    } catch (e) {
      return { errorCode: 1, message: `JSON出力に失敗しました: ${e}` }
    }
  }

  // CSV出力：全要素のフラット形式（BOM付きUTF-8）
  private writeCsv(
    outputDir: string,
    elementsMap: Map<string, UiElement[]>
  ): ModuleResult<void> {
    try {
      const header = CSV_COLUMNS.map((c) => c.header).join(",")
      const rows: string[] = []

      for (const elements of elementsMap.values()) {
        for (const el of elements) {
          const row = CSV_COLUMNS.map((col) => {
            const val = typeof col.key === "function"
              ? col.key(el)
              : (el as any)[col.key]
            return esc(val)
          }).join(",")
          rows.push(row)
        }
      }

      const content = BOM + [header, ...rows].join("\n")
      fs.writeFileSync(path.join(outputDir, ADJACENCY_CSV_FILENAME), content, "utf-8")
      console.log(`  ${ADJACENCY_CSV_FILENAME}: ${rows.length}行`)
      return { errorCode: 0 }
    } catch (e) {
      return { errorCode: 1, message: `CSV出力に失敗しました: ${e}` }
    }
  }

  // Markdown出力：コンポーネント単位・スコープグループ単位でグルーピング
  private writeMarkdown(
    outputDir: string,
    appName: string,
    elementsMap: Map<string, UiElement[]>
  ): ModuleResult<void> {
    try {
      const lines: string[] = [`# ${appName} - UI Elements`, ""]

      for (const [componentName, elements] of elementsMap) {
        if (elements.length === 0) continue
        lines.push(`## ${componentName}`, "")

        // スコープグループ単位でグルーピングして出力する
        const groups = this.groupByScope(elements)
        for (const [scopeKey, group] of groups) {
          const first = group[0]
          const scopeLabel = first.scopeGroupId
            ? `${first.parentScopeTag}（class: ${first.parentScopeClass ?? "なし"}）｜ 操作対象: ${group.length}件`
            : `${first.parentScopeTag}（単独要素）`
          lines.push(`### Scope: ${scopeLabel}`, "")
          lines.push(
            "| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |",
            "|---|---|---|---|---|---|---|---|---|---|---|"
          )
          for (const el of group) {
            lines.push(
              `| ${el.tag} | ${el.typeAttr ?? ""} | ${el.labelText ?? ""} | ${el.playwrightMethodPrefix} | ${el.interactionType} | ${el.isRequired} | ${el.isReadonly} | ${el.isHidden} | ${el.isDynamic} | ${el.maxLength ?? ""} | ${el.pattern ?? ""} |`
            )
          }
          lines.push("")
        }
      }

      fs.writeFileSync(
        path.join(outputDir, UI_ELEMENTS_MD_FILENAME),
        lines.join("\n"),
        "utf-8"
      )
      console.log(`  ${UI_ELEMENTS_MD_FILENAME}: ${elementsMap.size}コンポーネント`)
      return { errorCode: 0 }
    } catch (e) {
      return { errorCode: 1, message: `Markdown出力に失敗しました: ${e}` }
    }
  }

  // scopeGroupId単位でグループ化する（nullの場合は個別に扱う）
  private groupByScope(elements: UiElement[]): Map<string, UiElement[]> {
    const groups = new Map<string, UiElement[]>()
    for (const el of elements) {
      const key = el.scopeGroupId ?? `solo_${el.lineNumber}`
      const group = groups.get(key) ?? []
      group.push(el)
      groups.set(key, group)
    }
    return groups
  }
}
