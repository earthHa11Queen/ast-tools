```yaml
# ==============================================================================
# Architecture Definition: Playwright OOM (Operation Object Model)
# Author: Matsushita R&D Team
# Version: 1.0.0
# Description:
#   A custom UI test architecture built on Playwright (TypeScript).
#   Enforces strict separation of concerns between test scripts and page operations,
#   loose typing for anomaly testing, and a call-only script style.
#   Derived from 510_Playwright設計.md — confirmed and established rules only.
#
# Source Philosophy:
#   Playwright (TS) -> Page Object Model (POM)
#   Matsushita OOM  -> Operation Object Model (OOM) v1.0.0  [this file]
# ==============================================================================

architecture_profile:
  framework: "playwright"
  target_language: "TypeScript"
  design_pattern_name: "Operation Object Model (OOM)"
  core_philosophy: >
    Treat each screen as a Page Object (Page class).
    Wrap DOM operations to abstract locator complexity and loosen type safety
    intentionally using `any` type to enable "Mirror Principle" (anomaly) testing.
    Test scripts (Spec files) are call-only; no DOM logic inside test methods.

# ------------------------------------------------------------------------------
# 1. Directory & File Structure
# ------------------------------------------------------------------------------
structure_definition:
  root: "project/playwright/"

  layers:
    - name: "pages"
      path: "project/playwright/pages/"
      role: "Page Object layer. One file per screen, named after the screen's physical name."
      dependency_rules:
        - "MAY call utils/"
        - "MUST NOT call common/"
        - "MUST NOT call other pages/"

    - name: "common"
      path: "project/playwright/common/"
      role: >
        Cross-page business scenario layer.
        Handles multi-screen workflows (e.g., login flows, application flows)
        and shared screen-level utilities.
      dependency_rules:
        - "MAY call pages/"
        - "MAY call utils/"

    - name: "utils"
      path: "project/playwright/utils/"
      role: >
        Pure technical utility functions with no project dependency.
        Examples: date calculation, path generation, data normalization.
      dependency_rules:
        - "MUST NOT call pages/, common/, or values/"
        - "MAY be called from any layer"

    - name: "values"
      path: "project/playwright/values/"
      role: >
        Project-specific constants: URLs, folder paths, skip sentinels,
        and code-value objects with getter methods.
      dependency_rules:
        - "No outbound calls. Read-only constants layer."

    - name: "fixtures"
      path: "project/playwright/fixtures/"
      role: >
        Custom Playwright Fixture definitions.
        Manages browser context, extension on/off lifecycle,
        and headless/debug mode switching.
      dependency_rules:
        - "MAY reference values/"

# ------------------------------------------------------------------------------
# 2. Naming Conventions
# ------------------------------------------------------------------------------
naming_conventions:

  spec_files:
    extension: ".spec.ts"
    patterns:
      - format: "test-[screen-physical-name].spec.ts"
        use_case: "Single screen unit test"
        example: "test-user-management.spec.ts"
      - format: "test-[major]-[middle]-[minor].spec.ts"
        use_case: "Classification-based grouping (sort-aware)"
        example: "test-admin-user-registration.spec.ts"
    rules:
      - "All lowercase, hyphen-separated (kebab-case)"
      - "Prefix must be 'test-'"
      - "Filename order represents major > middle > minor classification"
      - "Up to 2 words per classification segment is implicitly acceptable"
      - "Sorting and classification awareness is mandatory when naming"

  test_data_files:
    prefix: "test-data"
    example: "test-data-user-registration.ts"

  page_files:
    rule: "Named after the screen's physical name. PascalCase class name."
    example: "UserManagementPage.ts -> class UserManagementPage"

  method_prefixes:
    input_field: "input"
    checkbox: "check"
    button_generic: "click"
    button_submit: "submit"
    button_add: "add"
    button_delete: "del"
    scope_switch: "focus"
    initialization: "setInitialization"
    wrapper_aggregation: "fill / navigate"

  screenshot_files:
    format: "[testCaseName]_[screenName]_[millisecondTimestamp].png"
    example: "TC001_UserManagement_1718000000000.png"

# ------------------------------------------------------------------------------
# 3. Component Responsibilities (The OOM Rules)
# ------------------------------------------------------------------------------
component_rules:

  # [Page Object] - Core operational layer
  page_object:
    definition: >
      A class that encapsulates all DOM operations for a single screen.
      Manages static roots, dynamic scope switching, and individual operations.

    three_layer_structure:
      layer1_static_root:
        name: "Static Root"
        description: >
          Immutable parent container locators confirmed after page navigation.
          Defined as class member variables.
          Set exclusively in setInitialization(), NOT in constructor.
        example_variables: ["searchFormArea", "resultTableArea", "headerArea"]

      layer2_scope_switching:
        name: "Scope Switching"
        description: >
          A cursor variable (currentScope) that points to the currently targeted element.
          Set by focus methods that accept index or condition arguments.
          Enables dynamic element targeting without coupling to operation methods.
        example_methods: ["focusResultRow(index: number)", "focusLastAddedAccordion()"]

      layer3_operation:
        name: "Operation"
        description: >
          All input/click methods operate from `this.currentScope` as the root locator.
          Operation methods do not know which index or row they are targeting.
          This enforces loose coupling between scope and operation.

    mandatory_rules:
      - rule_id: "LOOSE_TYPING"
        description: "Intentionally loosen type safety for user-facing input arguments."
        instruction: |
          Method arguments for DOM input operations MUST use `any` type.
          This enables anomaly injection (e.g., passing number to string field).
          NEVER use strict types (string, number) for input value parameters.
          Strict types ARE required for: flags (boolean), indexes (number), control parameters.

          Bad:  async inputUserName(value: string): Promise<boolean>
          Good: async inputUserName(value: any): Promise<boolean>

      - rule_id: "SKIP_SENTINEL"
        description: "Use DONT_INPUT_VALUE constant to explicitly skip an operation."
        instruction: |
          Import DONT_INPUT_VALUE from values/constants.ts.
          Check with strict reference equality (===), not loose equality (==).
          null and undefined are NOT skip signals — they mean "intentionally input empty value" (anomaly).

          Example:
            if (value === DONT_INPUT_VALUE) {
                return true;
            } else {
                await this.currentScope.locator('input[name="x"]').fill(normalizeInputValue(value));
                return true;
            }

      - rule_id: "IF_ELSE_MANDATORY"
        description: "All if statements must have an else clause. Single-line if is prohibited."
        instruction: |
          Bad:  if (value === DONT_INPUT_VALUE) return true;
          Good:
            if (value === DONT_INPUT_VALUE) {
                return true;
            } else {
                // operation
                return true;
            }

      - rule_id: "NO_THROW"
        description: "Exception throwing is prohibited in Page Object methods."
        instruction: |
          Never use `throw` inside Page Object methods.
          Let Playwright's built-in error handling fail the test naturally.
          All methods return boolean: true on success path, Playwright fails on error.

      - rule_id: "BOOLEAN_RETURN"
        description: "All Page Object methods return Promise<boolean>."
        instruction: |
          Return true on the normal execution path.
          Do NOT return false to signal errors — Playwright assertion failure handles that.
          This mirrors JUnit OOM's boolean return convention.

      - rule_id: "LATE_BINDING_CONSTRUCTOR"
        description: "Constructor must not initialize locators."
        instruction: |
          Constructor receives only `page: Page` and stores it.
          All locator definitions go in setInitialization().
          This prevents locator resolution before page navigation is complete.

      - rule_id: "WRAPPER_METHOD"
        description: "Aggregate multiple operation methods into a single fill/navigate wrapper."
        instruction: |
          Create a wrapper method (e.g., fillForm(dto: any)) that:
          1. Calls individual input methods sequentially
          2. Collects boolean results into an array
          3. Returns results.every(r => r === true)
          The DTO argument uses `any` type to accept anomaly data.

  # [Spec File] - Test script layer
  spec_file:
    definition: "The executable Playwright test file. Call-only. No DOM logic."

    mandatory_rules:
      - rule_id: "CALL_ONLY"
        description: "Test methods call Page Object or Common methods only."
        instruction: |
          No locator access inside test() blocks.
          No direct page.fill() or page.click() inside test() blocks.
          All operations go through Page Object or Common class methods.

      - rule_id: "DESCRIBE_TWO_LEVELS"
        description: "Minimum 2 levels of describe nesting required."
        instruction: |
          Structure:
            describe('Major Classification', () => {
                describe('Middle Classification', () => {
                    test('specific case', async () => { ... });
                });
            });
          This enables: individual test / grouped test / full script execution — 3 granularity levels.

      - rule_id: "NO_LOOPS_DEFAULT"
        description: "Loops inside test() blocks are prohibited by default."
        exception: >
          Loops ARE permitted when: same screen + same transition + similar items.
          In such cases, loop processing improves coding, debugging, and defect detection.

# ------------------------------------------------------------------------------
# 4. Constants Definition
# ------------------------------------------------------------------------------
constants_definition:
  file: "values/constants.ts"
  description: >
    Central constants file. Defines skip sentinels, project paths, URLs,
    and code-value objects.

  required_constants:
    - name: "DONT_INPUT_VALUE"
      type: "string"
      value: "'未入力文字列'"
      purpose: >
        Sentinel value to skip a DOM input operation in a Page Object method.
        MUST be checked with strict reference equality (===).
        null and undefined are NOT equivalent to this sentinel.

    - name: "DONT_INPUT_VALUE_STRICT"
      type: "string"
      value: "'未入力文字列$$'"
      purpose: "Collision-avoidance variant for edge cases."

  implementation: |
    export const DONT_INPUT_VALUE = '未入力文字列';
    export const DONT_INPUT_VALUE_STRICT = '未入力文字列$$';

# ------------------------------------------------------------------------------
# 5. Data Strategy
# ------------------------------------------------------------------------------
data_strategy:
  primary_format: "TypeScript object (export const ...)"
  secondary_format: "CSV (generated from Excel via macro/JavaScript)"

  rules:
    - rule: "Test data files must begin with 'test-data' prefix."
    - rule: >
        When using CSV, a corresponding TypeScript type/object wrapper MUST exist
        to validate structure and prevent silent data corruption.
    - rule: >
        CSV source MUST be authored in Excel and exported via macro or JavaScript.
        This separates authoring (Excel) from execution (TypeScript).
    - rule: >
        TypeScript object format is preferred when: patterns are limited,
        data is complex, or data volume is large (easier debugging).

  anomaly_data:
    instruction: >
      Anomaly data (wrong types, null, boundary values) are passed as `any` type
      directly through Page Object method arguments.
      The same method handles both normal and anomaly inputs without modification.
      This is the core of the Mirror Principle applied to UI testing.

# ------------------------------------------------------------------------------
# 6. Fixture Strategy
# ------------------------------------------------------------------------------
fixture_strategy:
  file: "fixtures/customFixture.ts"
  description: >
    Defines two exported test instances for environment separation.
    All test scripts import from this fixture, not from @playwright/test directly.

  exports:
    - name: "test"
      mode: "Headless ON (standard execution)"
      use_case: "Normal test runs, CI/CD pipeline"

    - name: "testB"
      mode: "Headless OFF (debug execution)"
      use_case: "Local debugging only. Never commit @test using testB."

  extension_management:
    rule: >
      Browser extension on/off lifecycle is managed exclusively within the Fixture.
      Extension reset is performed once per test via chrome://extensions UI automation.
      This prevents extension corruption during long test runs or proxy environments.
    implementation_note: >
      Use chromium.launchPersistentContext with --load-extension and
      --disable-extensions-except launch args.
      Extension path must be defined as a constant in values/.

# ------------------------------------------------------------------------------
# 7. Error Verification Strategy
# ------------------------------------------------------------------------------
error_verification_strategy:
  primary_method: "Text presence check (screen-wide string match)"
  secondary_method: "Count check (expected error count vs actual DOM count)"
  not_recommended: "Strict DOM position targeting for error messages (high maintenance cost)"

  rationale: >
    Strict locator targeting for error messages creates fragile tests that break
    on layout changes. Text existence + count is sufficient for functional verification.
    Visual positioning defects are covered by screenshot evidence (manual review).

  screenshot_policy:
    format: "[testCaseName]_[screenName]_[millisecondTimestamp].png"
    use_case: "Evidence for UI positioning defects, layout verification"

# ------------------------------------------------------------------------------
# 8. Debug Techniques
# ------------------------------------------------------------------------------
debug_techniques:
  - name: "about:blank execution"
    description: >
      For verifying utility methods that require no DOM, launch browser to about:blank.
      Output verification via console.log() or file output.
      Avoids the overhead of navigating to actual application pages.

  - name: "testB fixture"
    description: >
      Switch from `test` to `testB` import to enable Headless OFF mode.
      Allows visual observation of browser state during test execution.
      Must be reverted before commit.

# ------------------------------------------------------------------------------
# 9. AI Integration Guidelines
# ------------------------------------------------------------------------------
ai_integration:
  recommended_use_cases:
    - "Code completion for Page Object methods"
    - "Test code review and defect detection"
    - "Test code refactoring and cleanup"
    - "Test data generation and augmentation"
    - "Contradiction detection between test data and test code"
    - "Test case coverage review and gap identification"
    - "Batch file and utility script generation"
    - "Runtime error analysis and fix suggestion"
    - "Evidence file aggregation (Excel/PowerPoint from screenshots)"
    - "Unknown implementation pattern suggestion with examples"

  not_recommended:
    - scenario: "Bulk test code generation without human review"
      reason: >
        Quality assurance requires human awareness of test validity.
        Bulk generation is acceptable only when test cases are fully confirmed correct.
        Especially risky in high-pressure or unstable project environments.

# ------------------------------------------------------------------------------
# 10. Test Script Composition Patterns
# ------------------------------------------------------------------------------
script_composition_patterns:
  - pattern_id: "MIXED_NORMAL_ANOMALY"
    description: "Mix normal and anomaly cases per CaseNo within a single file."
    best_for: "Screens with many transitions but similar input/output patterns."

  - pattern_id: "SEPARATED_NORMAL_ANOMALY"
    description: "Separate normal and anomaly cases into distinct files."
    best_for: "Screens where error messages and verification targets differ significantly per case."

  - pattern_id: "LOOP_DRIVEN"
    description: "Use for-loop over CaseNo array to repeat similar operations."
    best_for: >
      Code-value exhaustive tests, checkbox active/inactive checks.
      Many transitions but each test verifies only a few items.

  - pattern_id: "EXTERNAL_SYSTEM"
    description: >
      Use loop over external file names or CaseNos to verify cross-system consistency.
      MUST be isolated from main test suite to prevent DOS-equivalent behavior.
    best_for: "External site result retrieval, cross-system data consistency checks."

# ------------------------------------------------------------------------------
# 11. Code Samples (Golden Master)
# ------------------------------------------------------------------------------
code_samples:

  page_object_example:
    file: "pages/UserManagementPage.ts"
    code: |
      import { Page, Locator } from '@playwright/test';
      import { DONT_INPUT_VALUE } from '../values/constants';
      import { normalizeInputValue } from '../utils/commonUtils';

      export class UserManagementPage {
          readonly page: Page;

          // Layer 1: Static Roots
          private userListArea: Locator;
          private inputFormArea: Locator;

          // Layer 2: Current Scope
          private currentScope: Locator;

          constructor(page: Page) {
              this.page = page;
              // Intentionally no locator initialization here (Late Binding)
          }

          async setInitialization(): Promise<boolean> {
              this.userListArea = this.page.locator('#user-list-wrapper');
              this.inputFormArea = this.page.locator('form#user-register-form');
              this.currentScope = this.page.locator('body');
              return true;
          }

          async focusUserRow(index: number): Promise<boolean> {
              this.currentScope = this.userListArea.locator('tr.user-data-row').nth(index);
              return true;
          }

          async focusLastRow(): Promise<boolean> {
              const count = await this.userListArea.locator('tr.user-data-row').count();
              let targetIndex = 0;
              if (count > 0) {
                  targetIndex = count - 1;
              } else {
                  targetIndex = 0;
              }
              this.currentScope = this.userListArea.locator('tr.user-data-row').nth(targetIndex);
              return true;
          }

          async inputUserName(value: any): Promise<boolean> {
              if (value === DONT_INPUT_VALUE) {
                  return true;
              } else {
                  const inputValue = normalizeInputValue(value);
                  await this.currentScope.locator('input[name="user_name"]').fill(inputValue);
                  return true;
              }
          }

          async fillUserForm(dto: any): Promise<boolean> {
              const results: boolean[] = [];
              results.push(await this.inputUserName(dto.userName));
              return results.every(r => r === true);
          }
      }

  utils_example:
    file: "utils/commonUtils.ts"
    code: |
      /**
       * Normalizes input value for DOM fill operations.
       * null/undefined -> empty string (anomaly input).
       * All other values passed through as-is (any type preserved).
       */
      export const normalizeInputValue = (val: any): any => {
          if (val === null || val === undefined) {
              return '';
          } else {
              return val;
          }
      };

  constants_example:
    file: "values/constants.ts"
    code: |
      export const DONT_INPUT_VALUE = '未入力文字列';
      export const DONT_INPUT_VALUE_STRICT = '未入力文字列$$';

  fixture_example:
    file: "fixtures/customFixture.ts"
    code: |
      import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
      import path from 'path';

      const EXTENSION_PATH = path.join(__dirname, '../../extensions/my-extension');

      const baseFixture = base.extend<{
          context: BrowserContext;
          page: Page;
      }>({
          context: async ({ browserName, headless }, use) => {
              let context: BrowserContext;
              if (browserName === 'chromium') {
                  const launchArgs = [
                      `--disable-extensions-except=${EXTENSION_PATH}`,
                      `--load-extension=${EXTENSION_PATH}`,
                  ];
                  context = await chromium.launchPersistentContext('', {
                      headless: headless,
                      args: launchArgs,
                      devtools: false,
                  });
              } else {
                  context = await base.context({ headless }, use);
              }
              await use(context);
              await context.close();
          },
          page: async ({ context, browserName }, use) => {
              const page = await context.newPage();
              if (browserName === 'chromium') {
                  // resetExtension(page) — called here if extension reset is needed
              }
              await use(page);
          },
      });

      export const test = baseFixture.extend({});          // Standard: Headless ON
      export const testB = baseFixture.extend({ headless: false }); // Debug: Headless OFF
      export { expect } from '@playwright/test';

# ------------------------------------------------------------------------------
# 12. Instructions for AI Agents
# ------------------------------------------------------------------------------
ai_instruction:
  role: "Senior QA Architect specialized in Playwright OOM (Operation Object Model)."
  directive: |
    When generating Playwright OOM code or explaining this architecture:
    1. ALWAYS separate Page Object logic (pages/) from test execution (*.spec.ts).
    2. ALWAYS use `any` type for user-facing input method arguments. NEVER use string/number.
    3. Strict types ARE required for: boolean flags, number indexes, control parameters.
    4. NEVER put locator access or page.fill()/page.click() inside test() blocks.
    5. ALWAYS use minimum 2 levels of describe() nesting in spec files.
    6. ALWAYS use DONT_INPUT_VALUE sentinel with === (strict reference equality).
    7. null and undefined are NOT skip signals — they mean "input empty value" (anomaly).
    8. NEVER use throw inside Page Object methods. Return boolean only.
    9. ALWAYS include else clause for every if statement. Single-line if is prohibited.
    10. setInitialization() initializes locators. Constructor stores page only.
    11. Wrapper methods (fillForm, navigateTo) aggregate boolean results via .every().
    12. Test data files must start with 'test-data' prefix.
    13. Spec files must end with '.spec.ts' and start with 'test-'.
    14. Import test/testB/expect from fixtures/customFixture.ts, NOT from @playwright/test directly.
```
