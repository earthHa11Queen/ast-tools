import * as fs from "fs";
import * as path from "path";

import type {GroupingTagNode,ModuleResult,} from "./dom_tree_ast_types";
import {TREE_RAW_CSV_FILENAME,} from "../config";
const BOM = "\uFEFF";

export class TreeOutputWriter {
  write(outputDir: string, nodes: GroupingTagNode[]): ModuleResult<void> {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      } else {

      }
    } catch (e) {
      return {errorCode: 1,message: `出力ディレクトリの作成に失敗しました: ${e}`,};
    }

    const header = [
      "screenName",
      "tagPath",
      "depth",
      "tagName",
      "classAttr",
      "idAttr",
      "directGroupingChildCount",
      "containedOperationTagCount",
      "directOperationTagCount",
      "nodeType",
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
    ].join(",");

    const lines = nodes.map((node) => [
      this.escape(node.screenName),
      this.escape(node.tagPath),
      String(node.depth),
      this.escape(node.tagName),
      this.escape(node.classAttr ?? ""),
      this.escape(node.idAttr ?? ""),
      String(node.directGroupingChildCount),
      String(node.containedOperationTagCount),
      String(node.directOperationTagCount),
      this.escape(node.nodeType),
      this.escape(node.textContent ?? ""),
      this.escape(node.roleAttr ?? ""),
      this.escape(node.ariaLabel ?? ""),
      this.escape(node.nameAttr ?? ""),
      this.escape(node.typeAttr ?? ""),
      this.escape(node.placeholderAttr ?? ""),
      this.escape(node.titleAttr ?? ""),
      this.escape(node.hrefAttr ?? ""),
      this.escape(node.dataTestIdAttr ?? ""),
      this.escape(node.labelText ?? ""),
      this.escape(node.ariaLabelledByText ?? ""),
      this.escape(node.semanticText ?? ""),
      this.escape(node.semanticSource ?? ""),
      this.escape(node.descendantTitleText ?? ""),
      this.escape(node.descendantDataTestIdAttr ?? ""),
      this.escape(node.contextText ?? ""),
    ].join(","));

    try {
      const outputPath = path.join(outputDir, TREE_RAW_CSV_FILENAME);
      fs.writeFileSync(outputPath, BOM + [header, ...lines].join("\n"), "utf-8");
      console.log(`${TREE_RAW_CSV_FILENAME}: ${lines.length}行`);

      return {
        errorCode: 0,
      };
    } catch (e) {
      return {errorCode: 1,message: `${TREE_RAW_CSV_FILENAME} の出力に失敗しました: ${e}`,};
    }
  }

  private escape(value: string): string {
    if (value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    } else {

    }

    return value;
  }
}