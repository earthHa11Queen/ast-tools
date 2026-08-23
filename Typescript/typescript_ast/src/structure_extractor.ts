import { Node, Statement } from "ts-morph";
import { MAX_NEST_DEPTH } from "../config";

// ===================================================
// structure_extractor.ts（新規）
//
// メソッド/関数の本体（Statement群）を再帰的に走査し、制御構造
// （if/else if/else・for・for-in・for-of・while・do-while・switchのcase/default）を
// 「処理単位」として検出する。処理単位は、上位の処理2〜9列が更新されたら
// それより下位の列はすべて0にリセットされる、という桁上げ式の座標系で表現する。
//
// 対応している制御構造（文レベル）：
//   if / else if / else, for, for-in, for-of, while, do-while,
//   switch の case / default, try / catch / finally,
//   ラベル付き文（ラベル自体は透過し、中の実際の分岐・繰り返しを検出する）
// 対象外（式レベルの分岐であり、この設計の対象外）：
//   三項演算子（a ? b : c）、&& / || による短絡評価
//
// 設計上の要点：
// ・if - else if - else のチェーンは、ASTとしては else 節がネストした IfStatement に
//   なるが、これは1段深いネストとしてではなく「同じ深さの並んだ処理単位」として
//   フラットに展開する（仕様書の例に合わせた挙動）。
// ・switch の各 case / default 節も、同じ深さの並んだ処理単位としてフラットに扱う。
// ・分岐後・繰り返し内部の具体的な処理内容は processContent に含めない。
//   キーワードと条件式のみを記載する（仕様書の指示通り）。
// ・処理9（MAX_NEST_DEPTH）より深いネストは対象外とし、それ以上は再帰を打ち切る。
// ===================================================

export type StructureRow = {
  coords: number[];   // 長さ9固定 [処理1, 処理2, ..., 処理9]（呼び出し元でprocess1のみ設定済みの状態で渡す）
  content: string;    // 処理内容列に入れる文字列（キーワード＋条件式のみ）
};

type ControlUnit = {
  text: string;
  bodyStatements: Statement[];
};

// メソッド本体を受け取り、そのメソッドの構造行（StructureRow[]）を組み立てる
// unitsが1件も見つからない場合（分岐・繰り返しが全く無いメソッド）は、
// 処理2〜9がすべて0の行を1行だけ返す（process1自体は必ず1行存在させる必要があるため）
export function buildStructureRows(bodyStatements: Statement[], process1: number): StructureRow[] {
  const baseCoords = new Array(MAX_NEST_DEPTH).fill(0);
  baseCoords[0] = process1;

  return collectUnitRows(bodyStatements, 2, baseCoords);
}

// depth（2〜9）の階層で処理単位を集め、見つかった各単位について
// 自身の行を1行生成しつつ、その中身をdepth+1として再帰的に処理する
function collectUnitRows(statements: Statement[], depth: number, parentCoords: number[]): StructureRow[] {
  const rows: StructureRow[] = [];
  if (depth > MAX_NEST_DEPTH) {
    return rows; // MAX_NEST_DEPTHより深いネストは対象外
  }

  const units = extractTopLevelUnits(statements);

  units.forEach((unit, index) => {
    const coords = [...parentCoords];
    coords[depth - 1] = index + 1; // 処理2はdepth=2→index0, 処理3はdepth=3→index1 ...
    rows.push({ coords, content: unit.text });

    if (depth < MAX_NEST_DEPTH) {
      rows.push(...collectUnitRows(unit.bodyStatements, depth + 1, coords));
    }
  });

  return rows;
}

// statements配下の「直下」にある制御構造を、同じ深さの処理単位として抽出する
// ブロック文（{ ... }）はそれ自体を処理単位とはせず、透過的に中身を展開する
function extractTopLevelUnits(statements: Statement[]): ControlUnit[] {
  const units: ControlUnit[] = [];

  for (const stmt of statements) {
    if (Node.isIfStatement(stmt)) {
      units.push(...flattenIfChain(stmt));
      continue;
    }
    if (Node.isForStatement(stmt)) {
      units.push({
        text: `for (${stmt.getInitializer()?.getText() ?? ""}; ${stmt.getCondition()?.getText() ?? ""}; ${stmt.getIncrementor()?.getText() ?? ""})`,
        bodyStatements: toStatementArray(stmt.getStatement()),
      });
      continue;
    }
    if (Node.isForInStatement(stmt)) {
      units.push({
        text: `for (${stmt.getInitializer().getText()} in ${stmt.getExpression().getText()})`,
        bodyStatements: toStatementArray(stmt.getStatement()),
      });
      continue;
    }
    if (Node.isForOfStatement(stmt)) {
      units.push({
        text: `for (${stmt.getInitializer().getText()} of ${stmt.getExpression().getText()})`,
        bodyStatements: toStatementArray(stmt.getStatement()),
      });
      continue;
    }
    if (Node.isWhileStatement(stmt)) {
      units.push({
        text: `while (${stmt.getExpression().getText()})`,
        bodyStatements: toStatementArray(stmt.getStatement()),
      });
      continue;
    }
    if (Node.isDoStatement(stmt)) {
      units.push({
        text: `do {} while (${stmt.getExpression().getText()})`,
        bodyStatements: toStatementArray(stmt.getStatement()),
      });
      continue;
    }
    if (Node.isSwitchStatement(stmt)) {
      for (const clause of stmt.getCaseBlock().getClauses()) {
        if (Node.isCaseClause(clause)) {
          units.push({
            text: `case ${clause.getExpression().getText()}:`,
            bodyStatements: clause.getStatements(),
          });
        } else {
          units.push({
            text: `default:`,
            bodyStatements: clause.getStatements(),
          });
        }
      }
      continue;
    }
    if (Node.isTryStatement(stmt)) {
      // try - catch - finally を、if - else if - else と同様に
      // 「同じ深さの並んだ処理単位」として扱う
      units.push({
        text: "try",
        bodyStatements: stmt.getTryBlock().getStatements(),
      });
      const catchClause = stmt.getCatchClause();
      if (catchClause) {
        const param = catchClause.getVariableDeclaration();
        const label = param ? `catch (${param.getText()})` : "catch";
        units.push({
          text: label,
          bodyStatements: catchClause.getBlock().getStatements(),
        });
      }
      const finallyBlock = stmt.getFinallyBlock();
      if (finallyBlock) {
        units.push({
          text: "finally",
          bodyStatements: finallyBlock.getStatements(),
        });
      }
      continue;
    }
    if (Node.isLabeledStatement(stmt)) {
      // ラベル（outer: for(...) のような目印）自体は分岐・繰り返しではないため、
      // 処理単位化はせず、ラベルの中身（実際のfor/while等）を同じ深さで透過的に展開する
      units.push(...extractTopLevelUnits([stmt.getStatement()]));
      continue;
    }
    if (Node.isBlock(stmt)) {
      // 単純なブロック文（if等に紐づかない裸の { ... }）は処理単位化せず、中身を同じ深さで展開する
      units.push(...extractTopLevelUnits(stmt.getStatements()));
      continue;
    }
    // 上記以外（単純な式文・宣言文・return文等）は処理単位として扱わない。
    // なお、三項演算子（a ? b : c）や && / || による短絡評価は、文ではなく式レベルの
    // 分岐であり、中に別の文を持つ構造ではないため、この設計の対象外とする。
  }

  return units;
}

// if - else if - else のチェーンをフラットな処理単位の列に展開する
function flattenIfChain(ifStmt: Node): ControlUnit[] {
  const units: ControlUnit[] = [];
  let current: any = ifStmt;
  let isFirst = true;

  while (current && Node.isIfStatement(current)) {
    const condText = current.getExpression().getText();
    units.push({
      text: isFirst ? `if (${condText})` : `else if (${condText})`,
      bodyStatements: toStatementArray(current.getThenStatement()),
    });
    isFirst = false;

    const elseStmt = current.getElseStatement();
    if (!elseStmt) {
      current = undefined;
    } else if (Node.isIfStatement(elseStmt)) {
      current = elseStmt; // else if へ継続
    } else {
      units.push({
        text: "else",
        bodyStatements: toStatementArray(elseStmt),
      });
      current = undefined;
    }
  }

  return units;
}

// Block（{ ... }）・単一のStatement・Statement[]のいずれであってもStatement[]へ正規化する
function toStatementArray(node: Node | Statement[]): Statement[] {
  if (Array.isArray(node)) {
    return node;
  }
  if (Node.isBlock(node)) {
    return node.getStatements();
  }
  return [node as Statement];
}