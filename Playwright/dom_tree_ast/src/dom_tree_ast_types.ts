export type NodeType = "grouping" | "operation";

export type SemanticSource =
  | "aria-label"
  | "label"
  | "aria-labelledby"
  | "placeholder"
  | "title"
  | "svg-title"
  | "text"
  | "name"
  | "data-testid"
  | "descendant-data-testid"
  | null;

export type GroupingTagNode = {
  screenName: string;
  tagPath: string;
  depth: number;

  tagName: string;
  classAttr: string | null;
  idAttr: string | null;

  directGroupingChildCount: number;
  containedOperationTagCount: number;
  directOperationTagCount: number;

  nodeType: NodeType;

  textContent: string | null;
  roleAttr: string | null;
  ariaLabel: string | null;
  nameAttr: string | null;
  typeAttr: string | null;
  placeholderAttr: string | null;
  titleAttr: string | null;
  hrefAttr: string | null;
  dataTestIdAttr: string | null;

  labelText: string | null;
  ariaLabelledByText: string | null;

  semanticText: string | null;
  semanticSource: SemanticSource;
  descendantTitleText: string | null;
  descendantDataTestIdAttr: string | null;
  contextText: string | null;
  
};

export type ScopeCandidate = {
  screenName: string;
  tagPath: string;
  operationTagCount: number;
  siblingScopeCount: number;
  priorityScore: number;

};

export type ScopeRole =
  | "static_root"
  | "current_scope"
  | "leaf_operation";

export type ResolvedScope = {
  screenName: string;
  scopeId: string;
  tagPath: string;
  role: ScopeRole;
  parentScopeId: string | null;
  repeatGroupSize: number | null;

  tagName: string | null;
  textContent: string | null;
  roleAttr: string | null;
  ariaLabel: string | null;
  nameAttr: string | null;
  typeAttr: string | null;
  placeholderAttr: string | null;
  titleAttr: string | null;
  hrefAttr: string | null;
  dataTestIdAttr: string | null;

  labelText: string | null;
  ariaLabelledByText: string | null;

  semanticText: string | null;
  semanticSource: SemanticSource;

  descendantTitleText: string | null;
  descendantDataTestIdAttr: string | null;
  contextText: string | null;
};

export type ModuleResult<T> = {
  errorCode: number;
  data?: T;
  message?: string;
};