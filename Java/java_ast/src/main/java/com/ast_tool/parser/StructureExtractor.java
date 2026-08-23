package com.ast_tool.parser;

import com.ast_tool.model.MethodInfo;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.stmt.*;

import java.util.ArrayList;
import java.util.List;

/**
 * StructureExtractor
 * TS版 structure_extractor.ts の Java移植版。
 * メソッド/コンストラクタの本体（Statement群）を再帰的に走査し、制御構造を
 * 「処理単位」として検出し、処理2〜9の桁上げ式座標を組み立てる。
 *
 * 対応している制御構造：
 * if / else if / else, for（古典的for）, 拡張for（TSのfor-ofに相当する
 * 最も近い概念として採用した。Javaにはfor-in相当の構文自体が存在しない）,
 * while, do-while, switch の case/default（従来型・アロー型どちらのSwitchEntryも
 * 同じAPIで扱えるため区別していない）, try / catch / finally, ラベル付き文
 *
 * TS版との差分（言語仕様の違いによる意図的な調整）：
 * ・for-in に直接対応するJava構文は存在しないため実装していない
 * ・【Java拡張】Javaのtry文は複数catch節を許容する（TS/JSは1つのcatchしか持てない）ため、
 * catch節ごとに個別の処理単位として展開する
 * 対象外（式レベルの分岐であり、この設計の対象外。TS版と同様の理由）：
 * 三項演算子（a ? b : c）、&& / || による短絡評価
 */
public class StructureExtractor {

    public static class StructureRow {
        public final int[] coords;
        public final String content;

        public StructureRow(int[] coords, String content) {
            this.coords = coords;
            this.content = content;
        }
    }

    private static class ControlUnit {
        final String text;
        final List<Statement> bodyStatements;

        ControlUnit(String text, List<Statement> bodyStatements) {
            this.text = text;
            this.bodyStatements = bodyStatements;
        }
    }

    // メソッド本体を受け取り、そのメソッドの構造行（StructureRow[]）を組み立てる
    // 処理単位が1件も見つからない場合は空のリストを返す
    // （process1自体の存在は、別途必ず生成される引数専用行が担う。TS版と同じ設計）
    public List<StructureRow> buildStructureRows(List<Statement> bodyStatements, int process1) {
        int[] baseCoords = new int[MethodInfo.MAX_NEST_DEPTH];
        baseCoords[0] = process1;
        return collectUnitRows(bodyStatements, 2, baseCoords);
    }

    // depth（2〜9）の階層で処理単位を集め、見つかった各単位について
    // 自身の行を1行生成しつつ、その中身をdepth+1として再帰的に処理する
    private List<StructureRow> collectUnitRows(List<Statement> statements, int depth, int[] parentCoords) {
        List<StructureRow> rows = new ArrayList<>();
        if (depth > MethodInfo.MAX_NEST_DEPTH) {
            return rows; // MAX_NEST_DEPTHより深いネストは対象外
        }

        List<ControlUnit> units = extractTopLevelUnits(statements);

        for (int index = 0; index < units.size(); index++) {
            ControlUnit unit = units.get(index);
            int[] coords = parentCoords.clone();
            coords[depth - 1] = index + 1; // 処理2はdepth=2→添字1, 処理3はdepth=3→添字2 ...
            rows.add(new StructureRow(coords, unit.text));

            if (depth < MethodInfo.MAX_NEST_DEPTH) {
                rows.addAll(collectUnitRows(unit.bodyStatements, depth + 1, coords));
            }
        }

        return rows;
    }

    // statements配下の「直下」にある制御構造を、同じ深さの処理単位として抽出する
    // ブロック文（{ ... }）はそれ自体を処理単位とはせず、透過的に中身を展開する
    private List<ControlUnit> extractTopLevelUnits(List<Statement> statements) {
        List<ControlUnit> units = new ArrayList<>();

        for (Statement stmt : statements) {
            if (stmt.isIfStmt()) {
                units.addAll(flattenIfChain(stmt.asIfStmt()));
                continue;
            }
            if (stmt.isForStmt()) {
                ForStmt f = stmt.asForStmt();
                String init = joinExpressions(f.getInitialization());
                String compare = f.getCompare().map(Node::toString).orElse("");
                String update = joinExpressions(f.getUpdate());
                units.add(new ControlUnit(
                        String.format("for (%s; %s; %s)", init, compare, update),
                        toStatementList(f.getBody())));
                continue;
            }
            if (stmt.isForEachStmt()) {
                // Javaの拡張for（for-each）はTSのfor-ofに相当する最も近い概念として採用した
                ForEachStmt fe = stmt.asForEachStmt();
                units.add(new ControlUnit(
                        String.format("for (%s : %s)", fe.getVariable().toString(), fe.getIterable().toString()),
                        toStatementList(fe.getBody())));
                continue;
            }
            if (stmt.isWhileStmt()) {
                WhileStmt w = stmt.asWhileStmt();
                units.add(new ControlUnit(
                        "while (" + w.getCondition().toString() + ")",
                        toStatementList(w.getBody())));
                continue;
            }
            if (stmt.isDoStmt()) {
                DoStmt d = stmt.asDoStmt();
                units.add(new ControlUnit(
                        "do {} while (" + d.getCondition().toString() + ")",
                        toStatementList(d.getBody())));
                continue;
            }
            if (stmt.isSwitchStmt()) {
                SwitchStmt sw = stmt.asSwitchStmt();
                for (SwitchEntry entry : sw.getEntries()) {
                    String label = entry.getLabels().isEmpty()
                            ? "default:"
                            : "case " + joinExpressions(entry.getLabels()) + ":";
                    units.add(new ControlUnit(label, new ArrayList<>(entry.getStatements())));
                }
                continue;
            }
            if (stmt.isTryStmt()) {
                TryStmt t = stmt.asTryStmt();
                units.add(new ControlUnit("try", new ArrayList<>(t.getTryBlock().getStatements())));
                // 【Java拡張】複数catch節をすべて個別の処理単位として展開する
                for (CatchClause cc : t.getCatchClauses()) {
                    units.add(new ControlUnit(
                            "catch (" + cc.getParameter().toString() + ")",
                            new ArrayList<>(cc.getBody().getStatements())));
                }
                t.getFinallyBlock()
                        .ifPresent(fb -> units.add(new ControlUnit("finally", new ArrayList<>(fb.getStatements()))));
                continue;
            }
            if (stmt.isLabeledStmt()) {
                // ラベル自体は分岐・繰り返しではないため処理単位化せず、中身を同じ深さで透過的に展開する
                List<Statement> inner = new ArrayList<>();
                inner.add(stmt.asLabeledStmt().getStatement());
                units.addAll(extractTopLevelUnits(inner));
                continue;
            }
            if (stmt.isBlockStmt()) {
                // 単純なブロック文（if等に紐づかない裸の { ... }）は処理単位化せず、中身を同じ深さで展開する
                units.addAll(extractTopLevelUnits(stmt.asBlockStmt().getStatements()));
                continue;
            }
            // 上記以外（単純な式文・宣言文・return文等）は処理単位として扱わない。
            // 三項演算子・&&・||による短絡評価は式レベルの分岐であり対象外（TS版と同様）。
        }

        return units;
    }

    // if - else if - else のチェーンをフラットな処理単位の列に展開する
    private List<ControlUnit> flattenIfChain(IfStmt ifStmt) {
        List<ControlUnit> units = new ArrayList<>();
        IfStmt current = ifStmt;
        boolean isFirst = true;

        while (current != null) {
            String condText = current.getCondition().toString();
            units.add(new ControlUnit(
                    (isFirst ? "if (" : "else if (") + condText + ")",
                    toStatementList(current.getThenStmt())));
            isFirst = false;

            if (current.getElseStmt().isEmpty()) {
                current = null;
            } else {
                Statement elseStmt = current.getElseStmt().get();
                if (elseStmt.isIfStmt()) {
                    current = elseStmt.asIfStmt();
                } else {
                    units.add(new ControlUnit("else", toStatementList(elseStmt)));
                    current = null;
                }
            }
        }

        return units;
    }

    // Block（{ ... }）・単一のStatementのいずれであってもStatement[]へ正規化する
    private List<Statement> toStatementList(Statement stmt) {
        if (stmt.isBlockStmt()) {
            return new ArrayList<>(stmt.asBlockStmt().getStatements());
        }
        List<Statement> list = new ArrayList<>();
        list.add(stmt);
        return list;
    }

    private String joinExpressions(List<? extends Node> nodes) {
        List<String> texts = new ArrayList<>();
        for (Node n : nodes) {
            texts.add(n.toString());
        }
        return String.join(", ", texts);
    }
}
