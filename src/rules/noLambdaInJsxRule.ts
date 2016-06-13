import * as ts from "typescript";
import * as Lint from "tslint/lib/lint";

export class Rule extends Lint.Rules.AbstractRule {
    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const noLambdaInJsxWalker = new NoLambdaInJsxWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(noLambdaInJsxWalker);
    }
}

class NoLambdaInJsxWalker extends Lint.RuleWalker {
    public visitJsxExpression(node: ts.JsxExpression) {
        // TODO
    }
}
