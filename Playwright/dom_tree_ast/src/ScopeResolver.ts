import type {
  GroupingTagNode,
  ScopeCandidate,
  ResolvedScope,
} from "./dom_tree_ast_types"

// ===================================================
// ScopeResolver【Phase2】
//
// ScopeCandidateとDOM階層構造から、
//
// ・static_root
// ・current_scope
// ・leaf_operation
//
// を確定する。
//
// leaf_operationについては、
// AIによるPlaywright/OOM生成に必要な
// Operation属性も引き継ぐ。
// ===================================================

export class ScopeResolver {

  resolve(
    candidates: ScopeCandidate[],
    allNodes: GroupingTagNode[]
  ): ResolvedScope[] {

    const screens = [
      ...new Set(
        allNodes.map(
          (n) => n.screenName
        )
      ),
    ]

    const results: ResolvedScope[] = []

    let staticRootCount = 0
    let currentScopeCount = 0
    let leafOperationCount = 0

    for (const screen of screens) {

      // ===================================================
      // 1.
      // Scope候補を浅い階層から評価する
      // ===================================================

      const screenCandidates =
        candidates
          .filter(
            (c) =>
              c.screenName === screen
          )
          .sort(
            (a, b) =>
              this.depthOf(a.tagPath)
              -
              this.depthOf(b.tagPath)
          )

      // tagPathからscopeIdを取得するためのMap
      //
      // 反復構造では同一tagPathが複数存在するため、
      // 同一構造について同じscopeIdが設定される。
      const scopeIdByTagPath =
        new Map<string, string>()

      // ===================================================
      // 2.
      // Static Root / Current Scopeを確定
      // ===================================================

      for (
        const candidate
        of screenCandidates
      ) {

        const scopeId =
          this.generateId(
            candidate.tagPath
          )

        scopeIdByTagPath.set(
          candidate.tagPath,
          scopeId
        )

        // ScopeCandidateBuilder側で
        //
        // 「同じ親に存在する候補数」
        //
        // ではなく、
        //
        // 「同じ親に存在する同一構造候補数」
        //
        // がsiblingScopeCountとして設定されている。
        const isRepeating =
          candidate.siblingScopeCount >= 2

        const role =
          isRepeating
            ? "current_scope"
            : "static_root"

        if (isRepeating) {
          currentScopeCount++
        } else {
          staticRootCount++
        }

        results.push({
          screenName:screen,
          scopeId,
          tagPath:candidate.tagPath,
          role,
          parentScopeId:this.findParentScopeId(candidate.tagPath,scopeIdByTagPath),
          repeatGroupSize:isRepeating? candidate.siblingScopeCount: null,
          // Scope行なのでOperation情報なし
          tagName: null,
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
          
        })
      }

      // ===================================================
      // 3.
      // Operation Nodeをleaf_operationとして追加
      // ===================================================

      const operationNodes =allNodes.filter((n) =>n.screenName === screen&&n.nodeType === "operation")

      for (const operation of operationNodes) {

        leafOperationCount++

        results.push({
          screenName:screen,
          scopeId:this.generateId(operation.tagPath),
          tagPath:operation.tagPath,
          role:"leaf_operation",
          parentScopeId:this.findParentScopeId(operation.tagPath,scopeIdByTagPath),
          repeatGroupSize:null,
          // ===================================================
          // raw CSVで取得したOperation情報を
          // resolved CSVへ引き継ぐ
          // ===================================================
          tagName:operation.tagName,
          textContent:operation.textContent,
          roleAttr:operation.roleAttr,
          ariaLabel:operation.ariaLabel,
          nameAttr:operation.nameAttr,
          typeAttr:operation.typeAttr,
          placeholderAttr:operation.placeholderAttr,
          titleAttr:operation.titleAttr,
          hrefAttr:operation.hrefAttr,
          dataTestIdAttr:operation.dataTestIdAttr,
          labelText: operation.labelText,
          ariaLabelledByText: operation.ariaLabelledByText,
          semanticText: operation.semanticText,
          semanticSource: operation.semanticSource,
          descendantTitleText: operation.descendantTitleText,
          descendantDataTestIdAttr: operation.descendantDataTestIdAttr,
          contextText: operation.contextText,
        })
      }
    }

    console.log(
      `ScopeResolver: ` +
      `static_root: ${staticRootCount}件, ` +
      `current_scope: ${currentScopeCount}件, ` +
      `leaf_operation: ${leafOperationCount}件`
    )

    return results
  }

  // ===================================================
  // tagPathの深度
  // ===================================================

  private depthOf(
    tagPath: string
  ): number {

    return (
      tagPath.split(">").length
    )
  }

  // ===================================================
  // 最も近い親Scopeを取得
  //
  // tagPathを1階層ずつ遡り、
  // 解決済みScopeが見つかった時点で返す。
  // ===================================================

  private findParentScopeId(
    tagPath: string,
    scopeIdByTagPath: Map<string, string>
  ): string | null {

    let current =
      tagPath

    while (true) {

      const index =
        current.lastIndexOf(">")

      if (
        index === -1
      ) {
        return null
      }

      current =
        current.slice(
          0,
          index
        )

      const found =
        scopeIdByTagPath.get(
          current
        )

      if (found) {
        return found
      }
    }
  }

  // ===================================================
  // tagPathから構造識別IDを生成
  //
  // 現段階では従来仕様を維持する。
  // 反復構造の同一tagPathについては
  // 同じscopeIdが生成される。
  // ===================================================

  private generateId(
    tagPath: string
  ): string {

    let hash = 0

    for (
      let i = 0;
      i < tagPath.length;
      i++
    ) {

      hash =
        (
          hash * 31
          +
          tagPath.charCodeAt(i)
        )
        >>> 0
    }

    return (
      hash
        .toString(16)
        .padStart(
          8,
          "0"
        )
        .slice(
          0,
          8
        )
    )
  }
}