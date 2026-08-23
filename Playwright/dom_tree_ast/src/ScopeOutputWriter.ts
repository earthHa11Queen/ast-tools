import * as fs from "fs"
import * as path from "path"

import type {
  ResolvedScope,
  ModuleResult,
} from "./dom_tree_ast_types"

import {
  SCOPE_RESOLVED_CSV_FILENAME,
} from "../config"

// ===================================================
// ScopeOutputWriter【Phase2】
//
// ResolvedScope[]を
// scope_resolved.csvとして出力する。
//
// このCSVは、
//
// ・Static Root
// ・Current Scope
// ・leaf operation
// ・Operation意味情報
//
// を1ファイルで確認できる形式とし、
// AIによるPlaywright/OOM生成入力としても
// 利用可能な形にする。
// ===================================================

const BOM = "\uFEFF"

export class ScopeOutputWriter {

  write(outputDir: string,scopes: ResolvedScope[]): ModuleResult<void> {
    // ===================================================
    // 出力ディレクトリ確認
    // ===================================================

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir,{recursive: true,})
      } else {

      }

    } catch (e) {

      return {errorCode: 1,message:`出力ディレクトリの作成に失敗しました: ${e}`,}
    }

    // ===================================================
    // CSV Header
    //
    // Scope構造に必要な情報を前半、
    // Playwright Operation生成に必要な情報を後半へ配置。
    // ===================================================

    const header = [
      "screenName",
      "scopeId",
      "tagPath",
      "role",
      "parentScopeId",
      "repeatGroupSize",

      "tagName",
      "textContent",
      "roleAttr",
      "ariaLabel",
      "nameAttr",
      "typeAttr",
      "placeholderAttr",
      "titleAttr",
      "hrefAttr",
      "dataTestIdAttr",
      "labelText",
      "ariaLabelledByText",
      "semanticText",
      "semanticSource",

      "descendantTitleText",
      "descendantDataTestIdAttr",
      "contextText",
    ].join(",")

    // ===================================================
    // CSV Body
    // ===================================================

    const lines =
      scopes.map((scope) => [
          this.escape(scope.screenName),
          this.escape(scope.scopeId),
          this.escape(scope.tagPath),
          this.escape(scope.role),
          this.escape(scope.parentScopeId?? ""),
          scope.repeatGroupSize=== null? "": String(scope.repeatGroupSize),
          this.escape(scope.tagName?? ""),
          this.escape(scope.textContent?? ""),
          this.escape(scope.roleAttr?? ""),
          this.escape(scope.ariaLabel?? ""),
          this.escape(scope.nameAttr?? ""),
          this.escape(scope.typeAttr?? ""),
          this.escape(scope.placeholderAttr?? ""),
          this.escape(scope.titleAttr?? ""),
          this.escape(scope.hrefAttr?? ""),
          this.escape(scope.dataTestIdAttr?? ""),
          this.escape(scope.labelText ?? ""),
          this.escape(scope.ariaLabelledByText ?? ""),
          this.escape(scope.semanticText ?? ""),
          this.escape(scope.semanticSource ?? ""),
          this.escape(scope.descendantTitleText ?? ""),
          this.escape(scope.descendantDataTestIdAttr ?? ""),
          this.escape(scope.contextText ?? ""),
        ].join(",")
      )

    // ===================================================
    // 出力
    // ===================================================

    try {

      const content =
        BOM
        +
        [
          header,
          ...lines,
        ].join("\n")

      const outputPath =
        path.join(
          outputDir,
          SCOPE_RESOLVED_CSV_FILENAME
        )

      fs.writeFileSync(
        outputPath,
        content,
        "utf-8"
      )

      console.log(
        `${SCOPE_RESOLVED_CSV_FILENAME}: ` +
        `${lines.length}行`
      )

      return {
        errorCode: 0,
      }

    } catch (e) {

      return {
        errorCode: 1,

        message:
          `${SCOPE_RESOLVED_CSV_FILENAME} ` +
          `の出力に失敗しました: ${e}`,
      }
    }
  }

  // ===================================================
  // CSV Escape
  //
  // ・カンマ
  // ・改行
  // ・CR
  // ・ダブルクォート
  //
  // を含む場合はRFC4180系のquoted fieldとして出力する。
  // ===================================================

  private escape(
    value: string
  ): string {

    if (
      value.includes(",")
      ||
      value.includes("\n")
      ||
      value.includes("\r")
      ||
      value.includes('"')
    ) {

      return (
        `"${value.replace(
          /"/g,
          '""'
        )}"`
      )
    }

    return value
  }
}