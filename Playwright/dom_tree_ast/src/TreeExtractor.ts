import { HTMLElement, parse } from "node-html-parser";
import type { LoadedHtml } from "./HtmlLoader";
import {GROUPING_TAGS,OPERATION_TAGS,} from "../config";
import type {GroupingTagNode,ModuleResult,SemanticSource,} from "./dom_tree_ast_types";

export class TreeExtractor {extractAll(loadedHtmlList: LoadedHtml[]): ModuleResult<GroupingTagNode[]> {
    try {
      const results: GroupingTagNode[] = [];

      for (const loadedHtml of loadedHtmlList) {
        const nodes = this.extract(loadedHtml.screenName, loadedHtml.html);
        results.push(...nodes);
      }

      console.log(`TreeExtractor: ${results.length}件`);

      return {errorCode: 0,data: results,};

    } catch (e) {
      return {errorCode: 1,message: `DOM解析に失敗しました: ${e}`,};
    }
  }

  extract(screenName: string, html: string): GroupingTagNode[] {
    const root = parse(html);
    const htmlElement = root.querySelector("html");

    if (!htmlElement) {
      return [];
    } else {

    }

    const labelTextByForId = this.buildLabelTextByForId(root);
    const textById = this.buildTextById(root);
    const results: GroupingTagNode[] = [];

    this.walkGroupingNode(screenName,htmlElement,"html",0,results,labelTextByForId,textById);
    return results;

  }

  private walkGroupingNode(screenName: string,element: HTMLElement,tagPath: string,depth: number,results: GroupingTagNode[],labelTextByForId: Map<string, string>,textById: Map<string, string>): void {
    const directGroupingChildren = this.getDirectGroupingChildren(element);
    const directOperationChildren = this.getDirectOperationChildren(element);
    const containedOperationTagCount = this.countContainedOperationTags(element);

    results.push({
      screenName,
      tagPath,
      depth,
      tagName: element.tagName.toLowerCase(),
      classAttr: this.getFirstClass(element),
      idAttr: this.normalizeAttribute(element.getAttribute("id")),
      directGroupingChildCount: directGroupingChildren.length,
      containedOperationTagCount,
      directOperationTagCount: directOperationChildren.length,
      nodeType: "grouping",
      textContent: null,
      roleAttr: null,
      ariaLabel: null,
      nameAttr: null,
      typeAttr: null,
      placeholderAttr: null,
      titleAttr: null,
      hrefAttr: null,
      dataTestIdAttr: null,
      labelText: null,
      ariaLabelledByText: null,
      semanticText: null,
      semanticSource: null,
      descendantTitleText: null,
      descendantDataTestIdAttr: null,
      contextText: null,
    });

    this.scanContext(
      screenName,
      element,
      tagPath,
      depth,
      results,
      labelTextByForId,
      textById
    );
  }

  private scanContext(
    screenName: string,
    context: HTMLElement,
    parentPath: string,
    parentDepth: number,
    results: GroupingTagNode[],
    labelTextByForId: Map<string, string>,
    textById: Map<string, string>
  ): void {
    let operationIndex = 0;

    for (const childNode of context.childNodes) {
      if (!(childNode instanceof HTMLElement)) {
        continue;
      }

      const child = childNode as HTMLElement;
      const tagName = child.tagName.toLowerCase();

      if (OPERATION_TAGS.includes(tagName)) {
        const operationPath = `${parentPath}>${tagName}[${operationIndex}]`;

        this.addOperationNode(
          screenName,
          child,
          operationPath,
          parentDepth + 1,
          results,
          labelTextByForId,
          textById
        );

        operationIndex += 1;
        continue;
      }

      if (GROUPING_TAGS.includes(tagName)) {
        const groupingPath = this.buildGroupingPath(parentPath, child);

        this.walkGroupingNode(
          screenName,
          child,
          groupingPath,
          parentDepth + 1,
          results,
          labelTextByForId,
          textById
        );

        continue;
      }

      this.scanContext(
        screenName,
        child,
        parentPath,
        parentDepth,
        results,
        labelTextByForId,
        textById
      );
    }
  }

  private addOperationNode(screenName: string,element: HTMLElement,tagPath: string,depth: number,results: GroupingTagNode[],labelTextByForId: Map<string, string>,textById: Map<string, string>): void {
    const idAttr = this.normalizeAttribute(element.getAttribute("id"));
    const textContent = this.normalizeText(element.textContent);
    const roleAttr = this.normalizeAttribute(element.getAttribute("role"));
    const ariaLabel = this.normalizeAttribute(element.getAttribute("aria-label"));
    const nameAttr = this.normalizeAttribute(element.getAttribute("name"));
    const typeAttr = this.normalizeAttribute(element.getAttribute("type"));
    const placeholderAttr = this.normalizeAttribute(element.getAttribute("placeholder"));
    const titleAttr = this.normalizeAttribute(element.getAttribute("title"));
    const hrefAttr = this.normalizeAttribute(element.getAttribute("href"));
    const dataTestIdAttr = this.normalizeAttribute(element.getAttribute("data-testid"));

    const labelText = idAttr ? labelTextByForId.get(idAttr) ?? null : null;
    const ariaLabelledByText = this.resolveAriaLabelledByText(element, textById);

    const descendantTitleText = this.resolveDescendantTitleText(element);
    const descendantDataTestIdAttr = this.resolveDescendantDataTestId(element);
    const contextText = this.resolveContextText(element);

    const semantic = this.resolveSemanticText({
      ariaLabel,
      labelText,
      ariaLabelledByText,
      placeholderAttr,
      titleAttr,
      descendantTitleText,
      textContent,
      nameAttr,
      dataTestIdAttr,
      descendantDataTestIdAttr,
    });

    results.push({
      screenName,
      tagPath,
      depth,
      tagName: element.tagName.toLowerCase(),
      classAttr: this.getFirstClass(element),
      idAttr,
      directGroupingChildCount: 0,
      containedOperationTagCount: 0,
      directOperationTagCount: 0,
      nodeType: "operation",
      textContent,
      roleAttr,
      ariaLabel,
      nameAttr,
      typeAttr,
      placeholderAttr,
      titleAttr,
      hrefAttr,
      dataTestIdAttr,
      labelText,
      ariaLabelledByText,
      descendantTitleText,
      descendantDataTestIdAttr,
      contextText,
      semanticText: semantic.text,
      semanticSource: semantic.source,
    });
  }

  private buildLabelTextByForId(root: HTMLElement): Map<string, string> {
    const result = new Map<string, string>();
    const labels = root.querySelectorAll("label");

    for (const label of labels) {
      const forId = this.normalizeAttribute(label.getAttribute("for"));

      if (!forId) {
        continue;
      }

      const text = this.normalizeText(label.textContent);

      if (!text) {
        continue;
      }

      result.set(forId, text);
    }

    return result;
  }

  private buildTextById(root: HTMLElement): Map<string, string> {
    const result = new Map<string, string>();
    const elements = root.querySelectorAll("[id]");

    for (const element of elements) {
      const id = this.normalizeAttribute(element.getAttribute("id"));

      if (!id) {
        continue;
      }

      const text = this.normalizeText(element.textContent);

      if (!text) {
        continue;
      }

      result.set(id, text);
    }

    return result;
  }

  private resolveAriaLabelledByText(element: HTMLElement, textById: Map<string, string>): string | null {
    const ariaLabelledBy = this.normalizeAttribute(element.getAttribute("aria-labelledby"));

    if (!ariaLabelledBy) {
      return null;
    }

    const ids = ariaLabelledBy.split(/\s+/).filter((value) => value.length > 0);
    const texts: string[] = [];

    for (const id of ids) {
      const text = textById.get(id);

      if (text) {
        texts.push(text);
      }
    }

    if (texts.length === 0) {
      return null;
    }

    return this.normalizeText(texts.join(" "));
  }

  private resolveSemanticText(values: {ariaLabel: string | null;labelText: string | null;ariaLabelledByText: string | null;placeholderAttr: string | null;titleAttr: string | null;descendantTitleText: string | null;textContent: string | null;nameAttr: string | null;dataTestIdAttr: string | null;descendantDataTestIdAttr: string | null;}): { text: string | null; source: SemanticSource } {
    if (values.ariaLabel) {
      return { text: values.ariaLabel, source: "aria-label" };
    }

    if (values.labelText) {
      return { text: values.labelText, source: "label" };
    }

    if (values.ariaLabelledByText) {
      return { text: values.ariaLabelledByText, source: "aria-labelledby" };
    }

    if (values.placeholderAttr) {
      return { text: values.placeholderAttr, source: "placeholder" };
    }

    if (values.titleAttr) {
      return { text: values.titleAttr, source: "title" };
    }

    if (values.descendantTitleText) {
      return { text: values.descendantTitleText, source: "svg-title" };
    }

    if (values.textContent) {
      return { text: values.textContent, source: "text" };
    }

    if (values.nameAttr) {
      return { text: values.nameAttr, source: "name" };
    }

    if (values.dataTestIdAttr) {
      return { text: values.dataTestIdAttr, source: "data-testid" };
    }

    if (values.descendantDataTestIdAttr) {
      return { text: values.descendantDataTestIdAttr, source: "descendant-data-testid" };
    }

    return { text: null, source: null };
    }

  private getDirectGroupingChildren(element: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];

    for (const childNode of element.childNodes) {
      if (!(childNode instanceof HTMLElement)) {
        continue;
      }

      const child = childNode as HTMLElement;
      const tagName = child.tagName.toLowerCase();

      if (GROUPING_TAGS.includes(tagName)) {
        result.push(child);
      }
    }

    return result;
  }

  private getDirectOperationChildren(element: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];

    for (const childNode of element.childNodes) {
      if (!(childNode instanceof HTMLElement)) {
        continue;
      }

      const child = childNode as HTMLElement;
      const tagName = child.tagName.toLowerCase();

      if (OPERATION_TAGS.includes(tagName)) {
        result.push(child);
      }
    }

    return result;
  }

  private countContainedOperationTags(element: HTMLElement): number {
    let count = 0;

    for (const childNode of element.childNodes) {
      if (!(childNode instanceof HTMLElement)) {
        continue;
      }

      const child = childNode as HTMLElement;
      const tagName = child.tagName.toLowerCase();

      if (OPERATION_TAGS.includes(tagName)) {
        count += 1;
        continue;
      }

      count += this.countContainedOperationTags(child);
    }

    return count;
  }

  private buildGroupingPath(parentPath: string, element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const firstClass = this.getFirstClass(element);

    if (firstClass) {
      return `${parentPath}>${tagName}.${firstClass}`;
    }

    return `${parentPath}>${tagName}`;
  }

  private getFirstClass(element: HTMLElement): string | null {
    const classAttr = this.normalizeAttribute(element.getAttribute("class"));

    if (!classAttr) {
      return null;
    }

    const firstClass = classAttr.split(/\s+/).find((value) => value.length > 0);

    return firstClass ?? null;
  }

  private normalizeAttribute(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private normalizeText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = value.replace(/\s+/g, " ").trim();

    if (normalized.length === 0) {
      return null;
    }

    const maxLength = 120;

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return normalized.slice(0, maxLength);
  }

  private resolveDescendantTitleText(element: HTMLElement): string | null {
    const titleElement = element.querySelector("svg title");

    if (!titleElement) {
      return null;
    }

    return this.normalizeText(titleElement.textContent);
  }
  private resolveDescendantDataTestId(element: HTMLElement): string | null {
    const target = element.querySelector("[data-testid]");

    if (!target) {
      return null;
    }

    return this.normalizeAttribute(target.getAttribute("data-testid"));
  }
  private resolveContextText(element: HTMLElement): string | null {
    const contextElement = this.findNearestContextElement(element);

    if (!contextElement) {
      return null;
    }

    let contextText = this.normalizeText(contextElement.textContent);

    if (!contextText) {
      return null;
    }

    const operationText = this.normalizeText(element.textContent);

    if (operationText) {
      contextText = this.normalizeText(contextText.replace(operationText, ""));
    }

    return contextText;
  }
  private findNearestContextElement(element: HTMLElement): HTMLElement | null {
    let current = element.parentNode;

    while (current instanceof HTMLElement) {
      const tagName = current.tagName;

      if (!tagName) {
        return null;
      }

      const normalizedTagName = tagName.toLowerCase();

      if (normalizedTagName === "li" || normalizedTagName === "tr") {
        return current;
      }

      current = current.parentNode;
    }

    return null;
  }

  
}

