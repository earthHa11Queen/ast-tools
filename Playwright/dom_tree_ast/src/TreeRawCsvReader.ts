import * as fs from "fs";

import type {
  GroupingTagNode,
  ModuleResult,
  NodeType,
  SemanticSource,
} from "./dom_tree_ast_types";

export class TreeRawCsvReader {
  read(filePath: string): ModuleResult<GroupingTagNode[]> {
    try {
      const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
      const rows = this.parseCsv(raw);

      if (rows.length === 0) {
        return {
          errorCode: 0,
          data: [],
        };
      }

      const header = rows[0];
      const headerMap = new Map<string, number>();

      for (let i = 0; i < header.length; i++) {
        headerMap.set(header[i], i);
      }

      const nodes: GroupingTagNode[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (row.every((value) => value.length === 0)) {
          continue;
        }

        nodes.push({
          screenName: this.getValue(row, headerMap, "screenName"),
          tagPath: this.getValue(row, headerMap, "tagPath"),
          depth: this.getNumber(row, headerMap, "depth"),
          tagName: this.getValue(row, headerMap, "tagName"),
          classAttr: this.getNullableValue(row, headerMap, "classAttr"),
          idAttr: this.getNullableValue(row, headerMap, "idAttr"),
          directGroupingChildCount: this.getNumber(row, headerMap, "directGroupingChildCount"),
          containedOperationTagCount: this.getNumber(row, headerMap, "containedOperationTagCount"),
          directOperationTagCount: this.getNumber(row, headerMap, "directOperationTagCount"),
          nodeType: this.getNodeType(row, headerMap),
          textContent: this.getNullableValue(row, headerMap, "textContent"),
          roleAttr: this.getNullableValue(row, headerMap, "roleAttr"),
          ariaLabel: this.getNullableValue(row, headerMap, "ariaLabel"),
          nameAttr: this.getNullableValue(row, headerMap, "nameAttr"),
          typeAttr: this.getNullableValue(row, headerMap, "typeAttr"),
          placeholderAttr: this.getNullableValue(row, headerMap, "placeholderAttr"),
          titleAttr: this.getNullableValue(row, headerMap, "titleAttr"),
          hrefAttr: this.getNullableValue(row, headerMap, "hrefAttr"),
          dataTestIdAttr: this.getNullableValue(row, headerMap, "dataTestIdAttr"),
          labelText: this.getNullableValue(row, headerMap, "labelText"),
          ariaLabelledByText: this.getNullableValue(row, headerMap, "ariaLabelledByText"),
          semanticText: this.getNullableValue(row, headerMap, "semanticText"),
          semanticSource: this.getSemanticSource(row, headerMap),
          descendantTitleText: this.getNullableValue(row, headerMap, "descendantTitleText"),
          descendantDataTestIdAttr: this.getNullableValue(row, headerMap, "descendantDataTestIdAttr"),
          contextText: this.getNullableValue(row, headerMap, "contextText"),
        });
      }

      return {
        errorCode: 0,
        data: nodes,
      };
    } catch (e) {
      return {
        errorCode: 1,
        message: `CSV読込に失敗しました: ${e}`,
      };
    }
  }

  private getValue(row: string[], headerMap: Map<string, number>, name: string): string {
    const index = headerMap.get(name);

    if (index === undefined || index >= row.length) {
      return "";
    }

    return row[index] ?? "";
  }

  private getNullableValue(row: string[], headerMap: Map<string, number>, name: string): string | null {
    const value = this.getValue(row, headerMap, name).trim();

    return value.length > 0 ? value : null;
  }

  private getNumber(row: string[], headerMap: Map<string, number>, name: string): number {
    const value = this.getValue(row, headerMap, name);
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getNodeType(row: string[], headerMap: Map<string, number>): NodeType {
    const value = this.getValue(row, headerMap, "nodeType");

    return value === "operation" ? "operation" : "grouping";
  }

  private getSemanticSource(row: string[], headerMap: Map<string, number>): SemanticSource {
    const value = this.getNullableValue(row, headerMap, "semanticSource");

    if (
      value === "aria-label"
      || value === "label"
      || value === "aria-labelledby"
      || value === "placeholder"
      || value === "title"
      || value === "svg-title"
      || value === "text"
      || value === "name"
      || value === "data-testid"
      || value === "descendant-data-testid"
    ) {
      return value;
    }

    return null;
  }

  private parseCsv(raw: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];

      if (inQuotes) {
        if (char === '"') {
          if (raw[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }

        continue;
      }

      if (char === '"') {
        inQuotes = true;
        continue;
      }

      if (char === ",") {
        row.push(field);
        field = "";
        continue;
      }

      if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        continue;
      }

      if (char === "\r") {
        continue;
      }

      field += char;
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }
}