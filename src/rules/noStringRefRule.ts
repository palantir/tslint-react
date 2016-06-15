import * as ts from "typescript";
import * as Lint from "tslint/lib/lint";
import { nodeIsKind } from "../guards";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "Pass a callback to ref prop instead of a string literal";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const noStringRefWalker = new NoStringRefWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(noStringRefWalker);
    }
}

class NoStringRefWalker extends Lint.RuleWalker {
    protected visitNode(node: ts.Node) {
        if (nodeIsKind<ts.JsxAttribute>(node, ts.SyntaxKind.JsxAttribute)) {
            const {name, initializer} = node;
            const isRefAttribute = name != null && name.text === "ref";
            if (isRefAttribute && initializer != null) {
                const hasStringInitializer = initializer.kind === ts.SyntaxKind.StringLiteral;
                const hasStringExpressionInitializer =
                    nodeIsKind<ts.JsxExpression>(initializer, ts.SyntaxKind.JsxExpression)
                    && (initializer.expression.kind === ts.SyntaxKind.StringLiteral
                    || initializer.expression.kind === ts.SyntaxKind.TemplateExpression);

                if (hasStringInitializer || hasStringExpressionInitializer) {
                    this.addFailure(this.createFailure(
                        initializer.getStart(),
                        initializer.getWidth(),
                        Rule.FAILURE_STRING
                    ));
                }
            }
        }

        super.visitNode(node);
    }
}
