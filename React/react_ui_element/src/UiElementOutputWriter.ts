import * as fs from "fs";
import * as path from "path";
import type {UiElement,ModuleResult,} from "./types";
import {UI_ELEMENTS_JSON_FILENAME,UI_ELEMENTS_CSV_FILENAME,UI_ELEMENTS_MD_FILENAME,CSV_ENCODING,} from "../../config";

// ===================================================
// UiElementOutputWriter
// UiElement[]をJSON、CSV、Markdownで出力する
//
// CSVカラム順：
//   A: 識別・位置
//   B: ラベル
//   C: 入力制約
//   D: 遷移・送信
//   E: 状態・可視性
//   F: アクセシビリティ
//   G: 動的生成・スコープ
//   H: Playwright連携
//
// CSVエンコーディング：UTF-8（BOMなし）
// ===================================================

function esc(value:| string| number| boolean| null| undefined): string {
  if (value === null ||value === undefined) {
    return "";
  } else {
    // nothing
  }

  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  } else {

  }
  return stringValue;
}

type CsvColumn = {
  header: string,
  key:| keyof UiElement| ((element: UiElement) => string)
}

const CSV_COLUMNS: CsvColumn[] = [
  {
    header: "screenName",
    key: "componentName",
  },
  {
    header: "lineNumber",
    key: "lineNumber",
  },
  {
    header: "tag",
    key: "tag",
  },
  {
    header: "idAttr",
    key: "idAttr",
  },
  {
    header: "nameAttr",
    key: "nameAttr",
  },
  {
    header: "classNameAttr",
    key: "classNameAttr",
  },
  {
    header: "dataTestId",
    key: "dataTestId",
  },
  {
    header: "typeAttr",
    key: "typeAttr",
  },
  {
    header: "roleAttr",
    key: "roleAttr",
  },

  {
    header: "labelText",
    key: "labelText",
  },
  {
    header: "labelUnresolved",
    key: "labelUnresolved",
  },
  {
    header: "placeholder",
    key: "placeholder",
  },
  {
    header: "title",
    key: "title",
  },
  {
    header: "ariaLabel",
    key: "ariaLabel",
  },
  {
    header: "ariaLabelledBy",
    key: "ariaLabelledBy",
  },
  {
    header: "htmlFor",
    key: "htmlFor",
  },
  {
    header: "labelProp",
    key: "labelProp",
  },

  {
    header: "maxLength",
    key: "maxLength",
  },
  {
    header: "minLength",
    key: "minLength",
  },
  {
    header: "maxValue",
    key: "maxValue",
  },
  {
    header: "minValue",
    key: "minValue",
  },
  {
    header: "step",
    key: "step",
  },
  {
    header: "pattern",
    key: "pattern",
  },
  {
    header: "inputMode",
    key: "inputMode",
  },
  {
    header: "accept",
    key: "accept",
  },
  {
    header: "autocomplete",
    key: "autocomplete",
  },

  {
    header: "href",
    key: "href",
  },
  {
    header: "target",
    key: "target",
  },
  {
    header: "formAction",
    key: "formAction",
  },
  {
    header: "formId",
    key: "formId",
  },

  {
    header: "isRequired",
    key: "isRequired",
  },
  {
    header: "isDisabled",
    key: "isDisabled",
  },
  {
    header: "isReadonly",
    key: "isReadonly",
  },
  {
    header: "isHidden",
    key: "isHidden",
  },
  {
    header: "isMultiple",
    key: "isMultiple",
  },
  {
    header: "isChecked",
    key: "isChecked",
  },
  {
    header: "defaultValue",
    key: "defaultValue",
  },
  {
    header: "tabIndex",
    key: "tabIndex",
  },

  {
    header: "ariaExpanded",
    key: "ariaExpanded",
  },
  {
    header: "ariaControls",
    key: "ariaControls",
  },
  {
    header: "ariaHaspopup",
    key: "ariaHaspopup",
  },
  {
    header: "ariaSelected",
    key: "ariaSelected",
  },
  {
    header: "ariaChecked",
    key: "ariaChecked",
  },

  {
    header: "isDynamic",
    key: "isDynamic",
  },
  {
    header: "parentScopeTag",
    key: "parentScopeTag",
  },
  {
    header: "parentScopeClass",
    key: "parentScopeClass",
  },
  {
    header: "parentScopeId",
    key: "parentScopeId",
  },
  {
    header: "siblingCount",
    key: "siblingCount",
  },
  {
    header: "scopeGroupId",
    key: "scopeGroupId",
  },

  {
    header: "interactionType",
    key: "interactionType",
  },
  {
    header: "mirrorAxisX",
    key: "mirrorAxisX",
  },
  {
    header: "playwrightMethodPrefix",
    key: "playwrightMethodPrefix",
  },
]

export class UiElementOutputWriter {write(outputDir: string,appName: string,elementsMap: Map<string, UiElement[]>): ModuleResult<void> {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir,{recursive: true,});
      } else {
        // nothing
      }

    } catch (e) {
      return {errorCode: 1,message:`出力ディレクトリの作成に失敗しました: ${e}`,}
    }

    const jsonResult = this.writeJson(outputDir,appName,elementsMap);
    if (jsonResult.errorCode !== 0) {
      return jsonResult;
    } else {
      // nothing
    }

    const csvResult = this.writeCsv(outputDir,elementsMap);
    if (csvResult.errorCode !== 0) {
      return csvResult;
    } else {

    }

    const markdownResult = this.writeMarkdown(outputDir,appName,elementsMap);
    if (markdownResult.errorCode !== 0) {
      return markdownResult;
    } else {
      // nothing
    }

    console.log(`出力完了: ${outputDir}`);
    return {errorCode: 0,};
  }

  private writeJson(outputDir: string,appName: string,elementsMap: Map<string, UiElement[]>): ModuleResult<void> {
    try {
      const outputObject: Record<string, unknown> = {
        appName,
        screens: {},
      }

      for (const [componentName,elements,] of elementsMap) {
        const normalizedElements = elements.map((element) => ({
          ...element,
          filePath: path.basename(element.filePath),
          }));

        const screens = outputObject.screens as Record<string, unknown>
        screens[componentName] = normalizedElements}
        fs.writeFileSync(path.join(outputDir,UI_ELEMENTS_JSON_FILENAME),JSON.stringify(outputObject,null,2),CSV_ENCODING)
        const total = [...elementsMap.values()].reduce((sum,elements) => sum + elements.length,0)
        console.log(`  ${UI_ELEMENTS_JSON_FILENAME}: ` +`${total}件`)
        return {errorCode: 0,}
      
      } catch (e) {
        return {errorCode: 1,message:`JSON出力に失敗しました: ${e}`,}
      }
    }

  private writeCsv(outputDir: string,elementsMap: Map<string, UiElement[]>): ModuleResult<void> {
    try {
      const header = CSV_COLUMNS.map((column) =>column.header).join(",")
      const rows: string[] = []
      for (const elements of elementsMap.values()) {
        for (const element of elements) {
          const row = CSV_COLUMNS.map((column) => {const value = typeof column.key === "function"? column.key(element): element[column.key]
            return esc(value)}).join(",")
            rows.push(row)
          }
        }
        const content = [header, ...rows].join("\n")
        fs.writeFileSync(path.join(outputDir,UI_ELEMENTS_CSV_FILENAME),content,CSV_ENCODING)
        console.log(`  ${UI_ELEMENTS_CSV_FILENAME}: ` +`${rows.length}行`)
        return {errorCode: 0,}
      } catch (e) {
        return {errorCode: 1,message:`CSV出力に失敗しました: ${e}`,}
      }
    }

  private writeMarkdown(outputDir: string,appName: string,elementsMap: Map<string, UiElement[]>): ModuleResult<void> {
    try {
      const lines: string[] = [`# ${appName} - UI Elements`,"",]
      for (const [componentName,elements,] of elementsMap) {
        if (elements.length === 0) {
          continue
        } else {
          // nothing
        }

        lines.push(`## ${componentName}`,"")
        const groups = this.groupByScope(elements)
        for (const group of groups.values()) {
          const first = group[0]
          const scopeLabel = first.scopeGroupId
          ?(`${first.parentScopeTag}` +`（class: ` +`${first.parentScopeClass ?? "なし"}）` +`｜ 操作対象: ${group.length}件`)
          : (`${first.parentScopeTag}` +"（単独要素）")
          lines.push(`### Scope: ${scopeLabel}`,"")
          lines.push(
            "| tag | typeAttr | labelText | methodPrefix | interactionType | isRequired | isReadonly | isHidden | isDynamic | maxLength | pattern |",
            "|---|---|---|---|---|---|---|---|---|---|---|"
          )
          for (const element of group) {
            lines.push(
              `| ${element.tag} ` +
              `| ${element.typeAttr ?? ""} ` +
              `| ${element.labelText ?? ""} ` +
              `| ${element.playwrightMethodPrefix} ` +
              `| ${element.interactionType} ` +
              `| ${element.isRequired} ` +
              `| ${element.isReadonly} ` +
              `| ${element.isHidden} ` +
              `| ${element.isDynamic} ` +
              `| ${element.maxLength ?? ""} ` +
              `| ${element.pattern ?? ""} |`
            )
          }
          lines.push("")
        }
      }

      fs.writeFileSync(path.join(outputDir,UI_ELEMENTS_MD_FILENAME),lines.join("\n"),CSV_ENCODING)
      console.log(`  ${UI_ELEMENTS_MD_FILENAME}: ` +`${elementsMap.size}コンポーネント`)
      return {errorCode: 0,}
      
    } catch (e) {
      return {errorCode: 1,message:`Markdown出力に失敗しました: ${e}`,}
    }
  }

  private groupByScope(elements: UiElement[]): Map<string, UiElement[]> {
    const groups = new Map<string, UiElement[]>()
    for (const element of elements) {
      const key = element.scopeGroupId ??`solo_${element.lineNumber}`
      const group = groups.get(key) ?? []
      group.push(element)
      groups.set(key, group)
    }

    return groups
  }
}