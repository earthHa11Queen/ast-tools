```yaml

# ==============================================================================
# Architecture Definition: Pytest OOM (Operation Object Model)
# Author: Matsushita R&D Team
# Version: 3.0.0
# Description: 
#   A custom unit/module testing architecture adapted from Playwright's Page Object Model.
#   It enforces strict separation of concerns, loose typing for anomaly testing, 
#   and a call-only script style.
# ==============================================================================

architecture_profile:
  framework: "pytest"
  target_language: "Python"
  design_pattern_name: "Operation Object Model (OOM)"
  core_philosophy: >
    Treat internal modules/classes like UI Pages. 
    Wrap them to abstract complexity and loosen type safety intentionally 
    to enable "Mirror Principle" (anomaly) testing.

# ------------------------------------------------------------------------------
# 1. Directory & File Structure
# ------------------------------------------------------------------------------
structure_definition:
  root: "tests/"
  
  # Unit Tests (Module Tests)
  unit_layer:
    path: "tests/unit/"
    description: "Tests that invoke internal classes/functions directly (No HTTP)."
    components:
      - directory: "wrappers/"
        role: "Operation Wrappers (The 'Pages')"
        rule: "Wraps target business logic. Handles type loosening and input logic."
      
      - directory: "scenarios/"
        role: "Test Scenarios (The 'Specs')"
        rule: "Contains execution flow only. No logic instantiation."
  
  # Integration Tests (API Tests)
  integration_layer:
    path: "tests/integration/"
    description: "Tests that invoke external API endpoints (HTTP)."
    components:
      - directory: "wrappers/"
        role: "API Clients"
        rule: "Wraps HTTP requests (GET/POST). Abbreviates endpoints."
        
      - directory: "scenarios/"
        role: "Test Scenarios"
        rule: "End-to-End flows calling API wrappers."

  # Shared Resources
  shared_layer:
    - path: "tests/utils/"
      role: "Common Utilities (Date calc, File I/O, Custom Asserts)."
    - path: "tests/data/"
      role: "Test Data Storage (YAML/CSV/JSON)."
    - path: "tests/conftest.py"
      role: "Global Fixtures (Mocks, Setup/Teardown)."

# ------------------------------------------------------------------------------
# 2. Component Responsibilities (The OOM Rules)
# ------------------------------------------------------------------------------
component_rules:
  
  # [Wrapper] - The most important layer for this architecture
  wrapper:
    definition: "A proxy class that interfaces with the System Under Test (SUT)."
    
    mandatory_rules:
      - rule_id: "LOOSE_TYPING"
        description: "Intentionally loosen type hints to allow anomaly injection."
        instruction: |
          Arguments MUST be typed as `Any` or `Dict`.
          NEVER use strict types (e.g., `int`, `UserBox`) in wrapper method signatures.
          This allows passing strings to int fields to test error handling.
      
      - rule_id: "INPUT_LOGIC"
        description: "Handle optional/missing inputs dynamically."
        instruction: |
          Use `if value is not None:` blocks to build arguments.
          Do not pass default values unless explicitly requested.

      - rule_id: "INSTANTIATION_HIDING"
        description: "Hide the complex initialization of the target class."
        instruction: |
          The wrapper's `__init__` should handle dependency injection (mocks).

  # [Scenario] - The test script layer
  scenario:
    definition: "The executable test file managed by pytest."
    
    mandatory_rules:
      - rule_id: "CALL_ONLY"
        description: "Scripts must only call Wrapper methods."
        instruction: "No business logic instantiation or raw data manipulation inside test functions."
      
      - rule_id: "NO_LOOPS"
        description: "Loops are prohibited in test functions."
        instruction: "Use `@pytest.mark.parametrize` for data-driven testing."

      - rule_id: "NESTED_GROUPING"
        description: "Hierarchical organization of tests."
        instruction: |
          Use Python classes to nest tests at least 2 levels deep.
          Structure: `class TestCategory:` -> `class TestDetail:` -> `def test_case():`

# ------------------------------------------------------------------------------
# 3. Naming Conventions
# ------------------------------------------------------------------------------
naming_conventions:
  files:
    pattern: "snake_case"
    format: "{prefix}_{category}_{detail}.py"
    example: "test_01_user_registration.py"
    purpose: "Ensure logical sorting in file explorers."

  wrappers:
    pattern: "PascalCase"
    suffix: "Wrapper"
    example: "UserModuleWrapper"

  test_classes:
    pattern: "PascalCase"
    prefix: "Test"
    nesting_example: "class TestUser(object): class TestValidation(object):"

# ------------------------------------------------------------------------------
# 4. Data Strategy
# ------------------------------------------------------------------------------
data_strategy:
  format: "List of Dictionaries"
  source: "Loaded from external YAML/CSV (Mirror Principle Data)."
  injection: "Injected via `@pytest.mark.parametrize`."
  validation: "Test logic splits assertions based on `is_normal` or `expected_error` flags in data."

# ------------------------------------------------------------------------------
# 5. Instructions for AI Agents
# ------------------------------------------------------------------------------
ai_instruction:
  role: "Senior QA Architect specialized in OOM (Operation Object Model)."
  directive: |
    When generating code or explaining this architecture:
    1. ALWAYS separate the "Logic" (Wrapper) from the "Execution" (Scenario).
    2. ALWAYS use `Any` type hints in Wrappers to support "Mirror Principle" (anomaly) data.
    3. NEVER put raw business logic or HTTP requests inside `test_` functions.
    4. Interpret "Unit API Test" as "Module Test using Wrappers", not HTTP tests.
```
