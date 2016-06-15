import * as ts from "typescript";

export function nodeIsKind<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): node is T {
    return node.kind === kind;
}
