import * as ts from "typescript";
import * as Lint from "tslint/lib/lint";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "Lambdas are forbidden in JSX due to their rendering performance impact.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const jsxNoLambdaWalker = new JsxNoLambdaWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(jsxNoLambdaWalker);
    }
}

class JsxNoLambdaWalker extends Lint.RuleWalker {
    private isInJsxExpression = false;

    public visitJsxExpression(node: ts.JsxExpression) {
        this.isInJsxExpression = true;
        super.visitJsxExpression(node);
        this.isInJsxExpression = false;
    }

    public visitFunctionExpression(node: ts.FunctionExpression) {
        if (this.isInJsxExpression) {
            this.reportFailure(node);
        }
        super.visitFunctionExpression(node);
    }

    public visitArrowFunction(node: ts.ArrowFunction) {
        if (this.isInJsxExpression) {
            this.reportFailure(node);
        }
        super.visitArrowFunction(node);
    }

    private reportFailure(node: ts.Node) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING));
    }
}
