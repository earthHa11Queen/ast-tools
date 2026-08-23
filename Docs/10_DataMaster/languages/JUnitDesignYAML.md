```yaml

# ==============================================================================
# Architecture Definition: JUnit OOM + TestDataRuntime
# Version: 2.0.0
# Purpose:
#   Generate a complete, compilable, executable JUnit 5 test implementation set
#   from validated test specifications, deterministic SQLite instructions,
#   source/AST/Cleaner outputs, and project build context.
# ==============================================================================

architecture_profile:
  framework: "junit5"
  target_language: "Java"
  design_pattern_name: "Operation Object Model (OOM)"
  generation_scope: "complete_junit_test_implementation"
  core_philosophy:
    - "Generate the complete JUnit test-side implementation, not only Scenario classes."
    - "Wrapper and Scenario are separate responsibilities."
    - "All validated test cases must be represented."
    - "One CaseNo represents one JUnit test case."
    - "CaseNo is used directly as the JUnit test title."
    - "The generated code must compile and execute in the target project."
    - "Test values are not invented by generated JUnit code; they are obtained through TestDataRuntime."
    - "Project-specific DTO/Object construction remains in generated test-side code."
    - "SQLite output is treated as deterministic instruction, not as advisory information."
    - "When old design text conflicts with the current runtime contract, the current runtime contract is authoritative."

# ------------------------------------------------------------------------------
# 1. Generated Artifact Scope
# ------------------------------------------------------------------------------

generated_artifacts:
  required:
    - kind: "wrapper"
      description: "One Wrapper per SUT class as required by the generated scenarios."
    - kind: "scenario"
      description: "JUnit 5 executable tests covering every validated CaseNo."
  conditional:
    - kind: "fixture"
      description: "Generated when setup/teardown, shared mocks, extensions, or common lifecycle logic are required."
    - kind: "utility"
      description: "Generated when common test-side construction or assertion logic is needed."
    - kind: "constant"
      description: "Generated when project/test constants are required."
    - kind: "data_provider"
      description: "Generated when reusable providers are required by the selected scenario structure."
  completion_rule: >
    The result is complete only when all generated Java sources required by the
    selected validated test cases can compile together in the target project.

# ------------------------------------------------------------------------------
# 2. Input Authority / Ownership
# ------------------------------------------------------------------------------

input_authority:
  validated_test_specification:
    role: "Defines what each test case means and what must be verified."
    authoritative_for:
      - "CaseNo"
      - "test case meaning"
      - "operation semantics"
      - "verification semantics"
      - "expected result semantics"
      - "generatorTarget / generatorRule when present"

  test_data_instruction:
    role: "Defines which runtime values are required for each CaseNo."
    authoritative_for:
      - "dataId"
      - "dataRole"
      - "convModel"
      - "mirrorX"
      - "mirrorY"
      - "mirrorZ"
      - "validationMin"
      - "validationMax"
      - "nullable"
      - "referenceType"
      - "fixedValue"
      - "referenceValues"

  java_source:
    role: "Defines actual production Java structure and behavior."
    authoritative_for:
      - "package"
      - "class names"
      - "method signatures"
      - "constructors"
      - "return types"
      - "annotations"
      - "exceptions"
      - "control flow"
      - "dependency relations"

  ast_and_cleaner:
    role: >
      Provides machine-normalized structure and relations extracted from source.
      It exists to reduce ambiguity and to expose class/method/field/argument/DTO/object
      relations in a form that is easier and safer for code generation.

  project_build_context:
    role: "Defines how generated sources must compile in the actual project."
    authoritative_for:
      - "Java version"
      - "Maven/JUnit/Mockito versions and dependencies"
      - "source roots"
      - "test source roots"
      - "existing test-side modules"
      - "package/import availability"

  junit_architecture:
    role: "Defines Wrapper/Scenario/test-side architecture and code conventions."

  runtime_contract:
    role: "Defines how generated test code obtains deterministic test values."
    authority_rule: >
      Runtime behavior and the current runtime contract override older JUnit design
      examples when those examples predate TestDataRuntime.

# ------------------------------------------------------------------------------
# 3. TestDataRuntime Contract
# ------------------------------------------------------------------------------

test_data_runtime:
  purpose: >
    Convert test_data_instruction.csv rows into executable Java values while recording
    exact execution evidence and supporting replay.

  public_usage:
    primary_method: "getValue(caseNo, dataId, Class<T>)"
    key:
      generation: "CaseNo + dataId"
      evidence_and_replay: "CaseNo + dataId + elementIndex"

  supported_models:
    scalar:
      - "STRING"
      - "NUMBER"
      - "DECIMAL"
      - "BOOLEAN"
      - "DATE"
      - "DATETIME"
      - "ENUM"
      - "other supported scalar conversions"
    containers:
      - "COLLECTION"
      - "ARRAY"
      - "MAP"

  normalized_container_mapping:
    note: "convModel is a cross-language normalized model, not raw Java syntax."
    java_examples:
      "T[]": "COLLECTION"
      "List": "COLLECTION"
      "Queue": "COLLECTION"
      "Deque": "COLLECTION"
      "Set": "ARRAY"
      "Map": "MAP"

  container_cardinality:
    normal_default: 3
    rules:
      length_null: "container itself is null"
      length_empty: 0
      length_min: "validationMin"
      length_min_minus_1: "validationMin - 1"
      length_max: "validationMax"
      length_max_plus_1: "validationMax + 1"
      length_normal_mid: >
        Use normal default count 3 and clamp to the valid range when required.
        This is not the mathematical midpoint for containers.

  container_children:
    sequence_child_suffix: "[]"
    map_key_suffix: "{key}"
    map_value_suffix: "{value}"

  structural_validity:
    map_keys: "Must be unique when multiple entries are generated."
    set_elements: "Must be unique when multiple elements are generated."
    rule: >
      Structural uniqueness is technical validity and must not be reinterpreted as a
      new Mirror Principle test viewpoint.

  project_object_boundary:
    runtime_does_not_construct:
      - "project-specific DTO graphs"
      - "project-specific arbitrary Object graphs"
    generated_test_code_must_handle:
      - "constructors"
      - "setters"
      - "builders"
      - "factories"
      - "project-specific object graph assembly"
      - "SUT invocation"

  evidence:
    columns:
      - "CaseNo"
      - "dataId"
      - "targetId"
      - "dataRole"
      - "convModel"
      - "mirrorX"
      - "mirrorY"
      - "mirrorZ"
      - "validationMin"
      - "validationMax"
      - "nullable"
      - "referenceType"
      - "elementIndex"
      - "valueState"
      - "actualValue"
      - "actualLength"
      - "runMode"
    element_index:
      scalar_or_direct_root: -1
      collection_or_array_child: "0,1,2,..."
      map_pair: "key and value rows for the same logical entry use the same elementIndex"
      nested: >
        Occurrence index is scoped to CaseNo + dataId in deterministic traversal order.

  replay:
    rule: "Reconstruct the exact executed values from Evidence. Do not regenerate Mirror values."

# ------------------------------------------------------------------------------
# 4. JUnit OOM Structure
# ------------------------------------------------------------------------------

structure_definition:
  root: "src/test/java/{base_package}/"
  unit_layer:
    wrappers:
      path: "unit/wrappers/"
      role: "Operation wrappers for SUT classes."
    scenarios:
      path: "unit/scenarios/"
      role: "Executable JUnit 5 scenarios."
  shared_layer:
    utils:
      path: "utils/"
    fixtures:
      path: "fixtures/"
    constants:
      path: "constants/"

# ------------------------------------------------------------------------------
# 5. Wrapper Rules
# ------------------------------------------------------------------------------

wrapper:
  mapping:
    rule: "One Wrapper class per one SUT class."
  purpose:
    - "Hide SUT construction and dependency injection complexity."
    - "Expose the operations needed by all generated scenarios."
    - "Keep Scenario methods focused on execution flow."
  generation_scope_rule: >
    Wrapper APIs are generated from the complete set of validated scenarios and the
    actual SUT structure. The generated Wrapper set must contain every operation required
    by the generated Scenario set.
  typing:
    default_argument_type: "Object"
    rationale: "Preserve anomaly injection capability required by Mirror Principle."
  optional_input:
    rule: >
      DONT_INPUT_VALUE means skip the input operation.
      null is not the same as skip; null means intentionally pass null.
  instantiation:
    rule: "SUT construction and dependency injection are hidden by Wrapper/setup code."
  exceptions:
    rule: >
      Scenario-level assertions may use assertThrows when the validated test specification
      requires an exception. Wrapper behavior must not erase an exception that the test must observe.
  if_statement:
    rule: "Generated if statements follow the project/OOM convention requiring explicit else branches when applicable."

# ------------------------------------------------------------------------------
# 6. Scenario Rules
# ------------------------------------------------------------------------------

scenario:
  framework: "JUnit 5 Jupiter"
  one_case_rule: "One validated CaseNo equals one JUnit test case."
  title_rule: "Use CaseNo directly as the JUnit test title."
  case_preservation:
    - "Do not invent new CaseNo values."
    - "Do not merge multiple CaseNo values into one test."
    - "Do not silently omit a validated CaseNo."
  call_only:
    rule: >
      @Test / @ParameterizedTest bodies should express execution flow using Wrapper and
      test-side helpers. Raw SUT construction and ad-hoc test-data generation do not belong
      in the test body.
  loops:
    rule: "Do not place ad-hoc loops in test methods; use JUnit parameterization or helpers when iteration is structurally required."
  grouping:
    rule: "Use the current project grouping convention; @Nested is available when required by the JUnit architecture."

# ------------------------------------------------------------------------------
# 7. Data Retrieval and Object Assembly
# ------------------------------------------------------------------------------

test_data_flow:
  per_case:
    - "Collect every test-data-instruction row whose CaseNo matches the scenario CaseNo."
    - "Do not limit retrieval to TARGET rows; NORMAL sibling data may be required to execute the case."
    - "Obtain executable values from TestDataRuntime."
    - "Use referenceType and source/AST/Cleaner structure to select the Java receiving type."
    - "Construct project DTO/Object graphs in generated test-side helper/provider/setup code."
    - "Pass the completed arguments to the appropriate Wrapper operation."

  mirror_rule: >
    Generated JUnit code must not independently calculate Mirror X/Y/Z concrete values
    when TestDataRuntime is responsible for them.

# ------------------------------------------------------------------------------
# 8. Assertion / Oracle Rules
# ------------------------------------------------------------------------------

assertion:
  primary_source:
    - "validated test specification: verification content"
    - "validated test specification: verification procedure"
    - "validated test specification: expected result"
    - "validated test specification: expected result decision criteria"
  executable_mapping_sources:
    - "actual SUT return type"
    - "observable exception behavior"
    - "observable state change"
    - "Wrapper output"
    - "available mocks/dependencies"
  rule: >
    Convert the expected meaning already defined by the validated test specification into
    executable JUnit assertions. Do not replace the validated expected meaning with a newly
    invented test oracle.

# ------------------------------------------------------------------------------
# 9. Build / Compilation Contract
# ------------------------------------------------------------------------------

build_contract:
  goal: "Generated Java sources must compile and execute in the actual target project."
  required_context:
    - "pom.xml or equivalent Maven dependency information"
    - "Java version"
    - "JUnit version"
    - "Mockito version if used"
    - "Maven Surefire configuration"
    - "production source package structure"
    - "test source package structure"
    - "existing test utilities/fixtures/constants when relevant"
  imports:
    rule: "Use only classes and packages that are present in the supplied project context or generated output."
  placeholders:
    rule: "Do not leave TODO, pseudocode, omitted methods, ellipses, or unresolved imports in final generated Java sources."

# ------------------------------------------------------------------------------
# 10. Generation Procedure
# ------------------------------------------------------------------------------

generation_procedure:
  - step: 1
    action: "Read the complete prompt and all embedded inputs before generating files."
  - step: 2
    action: "Build a complete map of validated CaseNo values and target relations."
  - step: 3
    action: "Join each CaseNo to all corresponding test-data-instruction rows."
  - step: 4
    action: "Read source/AST/Cleaner/project context and derive the actual test-side dependency graph."
  - step: 5
    action: "Determine the complete Wrapper operation set required by all scenarios."
  - step: 6
    action: "Generate Wrapper classes and shared test-side support code."
  - step: 7
    action: "Generate one executable JUnit test case per validated CaseNo."
  - step: 8
    action: "Use CaseNo as the test title."
  - step: 9
    action: "Connect TestDataRuntime values to DTO/Object construction and Wrapper invocation."
  - step: 10
    action: "Generate assertions from the validated expected-result semantics."
  - step: 11
    action: "Resolve packages, imports, mocks, fixtures, utilities, and constants."
  - step: 12
    action: "Perform a final internal consistency pass across all generated Java files."

# ------------------------------------------------------------------------------
# 11. Output Completeness
# ------------------------------------------------------------------------------

output_rules:
  complete_output:
    - "Return every generated Java source file required for the test implementation."
    - "Each file must include its relative output path."
    - "Each source file must be complete."
    - "Do not omit repetitive scenarios merely because they are numerous."
    - "Do not replace source code with summaries."
  validation_target:
    - "All validated CaseNo values are represented."
    - "All referenced Wrapper methods exist."
    - "All Runtime dataId references exist in the supplied instruction data."
    - "All imports are resolvable from supplied/generated context."
    - "All DTO/Object construction paths are grounded in supplied project structure."


```
