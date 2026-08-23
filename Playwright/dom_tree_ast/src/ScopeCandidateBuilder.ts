import type {
  GroupingTagNode,
  ScopeCandidate,
} from "./dom_tree_ast_types"

// ===================================================
// ScopeCandidateBuilder【Phase2】
//
// GroupingTagNode[]から
// Static Root / Current Scope候補を抽出する。
//
// Current Scope判定用のsiblingScopeCountは、
//
//   同じ親に存在する候補数
//
// ではなく、
//
//   同じ親に存在する
//   「同一構造」の候補数
//
// として算出する。
// ===================================================

export class ScopeCandidateBuilder {

  build(
    nodes: GroupingTagNode[]
  ): ScopeCandidate[] {

    const groupingNodes =
      nodes.filter(
        (n) =>
          n.nodeType === "grouping"
      )

    // ===================================================
    // 1. 最小Scope候補抽出
    // ===================================================

    const candidateNodes =
      groupingNodes.filter(
        (n) =>

          // 直下にOperationが2件以上
          n.directOperationTagCount >= 2

          ||

          // 配下にOperationが2件以上あり、
          // 子Groupingが1以下
          (
            n.containedOperationTagCount >= 2
            &&
            n.directGroupingChildCount <= 1
          )
      )

    const candidates:
      ScopeCandidate[] =
      candidateNodes.map(
        (n) => ({

          screenName:
            n.screenName,

          tagPath:
            n.tagPath,

          operationTagCount:
            Math.max(
              n.directOperationTagCount,
              n.containedOperationTagCount
            ),

          siblingScopeCount: 1,

          priorityScore: 0,
        })
      )

    // candidateのtagPathから
    // 元GroupingTagNodeを引けるようにする
    const nodeByKey =
      new Map<
        string,
        GroupingTagNode
      >()

    for (
      const node
      of candidateNodes
    ) {

      const key =
        this.nodeKey(
          node.screenName,
          node.tagPath
        )

      // 同一tagPathが繰り返し構造で複数存在する場合、
      // どれも基本的に同一構造なので
      // 最初の1件を代表として保持する。
      if (
        !nodeByKey.has(key)
      ) {

        nodeByKey.set(
          key,
          node
        )
      }
    }

    // ===================================================
    // 2.
    // 同一親 + 同一構造でグルーピング
    // ===================================================

    const repeatGroups =
      new Map<
        string,
        ScopeCandidate[]
      >()

    for (
      const candidate
      of candidates
    ) {

      const node =
        nodeByKey.get(
          this.nodeKey(
            candidate.screenName,
            candidate.tagPath
          )
        )

      if (!node) {
        continue
      }

      const key = [
        candidate.screenName,
        this.parentPath(
          candidate.tagPath
        ),
        this.structureSignature(
          node
        ),
      ].join("::")

      if (
        !repeatGroups.has(key)
      ) {

        repeatGroups.set(
          key,
          []
        )
      }

      repeatGroups
        .get(key)!
        .push(candidate)
    }

    // ===================================================
    // 3. 同一構造件数を設定
    // ===================================================

    for (
      const group
      of repeatGroups.values()
    ) {

      const repeatCount =
        group.length

      for (
        const candidate
        of group
      ) {

        candidate.siblingScopeCount =
          repeatCount
      }
    }

    // ===================================================
    // 4. priorityScore
    //
    // 現段階ではResolverの主要判定には使わない。
    // 将来の比較・拡張用補助値として保持。
    // ===================================================

    for (
      const candidate
      of candidates
    ) {

      candidate.priorityScore =
        candidate.operationTagCount
        * 100
        +
        candidate.siblingScopeCount
    }

    const screenCount =
      new Set(
        candidates.map(
          (c) => c.screenName
        )
      ).size

    console.log(
      `ScopeCandidateBuilder: ` +
      `スコープ候補抽出: ` +
      `${candidates.length}件` +
      `（${screenCount}画面合計）`
    )

    return candidates
  }

  // ===================================================
  // 構造Signature
  //
  // 現段階では「軽量な構造一致」に限定する。
  //
  // DOMサブツリー全文などを含めないため、
  // 出力・AIトークン量にも影響しない。
  // ===================================================

  private structureSignature(
    node: GroupingTagNode
  ): string {

    return [
      node.tagName,
      node.classAttr ?? "",
      node.directGroupingChildCount,
      node.directOperationTagCount,
      node.containedOperationTagCount,
    ].join("|")
  }

  private nodeKey(
    screenName: string,
    tagPath: string
  ): string {

    return (
      `${screenName}::${tagPath}`
    )
  }

  private parentPath(
    tagPath: string
  ): string {

    const idx =
      tagPath.lastIndexOf(">")

    return idx === -1
      ? ""
      : tagPath.slice(
          0,
          idx
        )
  }
}