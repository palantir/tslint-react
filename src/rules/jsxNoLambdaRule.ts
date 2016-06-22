/**
 * @license
 * Copyright 2016 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";
import * as Lint from "tslint/lib/lint";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "Lambdas are forbidden in JSX attributes due to their rendering performance impact";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const jsxNoLambdaWalker = new JsxNoLambdaWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(jsxNoLambdaWalker);
    }
}

class JsxNoLambdaWalker extends Lint.RuleWalker {
    private isInJsxAttribute = false;

    protected visitNode(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.JsxAttribute) {
            this.isInJsxAttribute = true;
            super.visitNode(node);
            this.isInJsxAttribute = false;
        } else {
            super.visitNode(node);
        }
    }

    protected visitFunctionExpression(node: ts.FunctionExpression) {
        if (this.isInJsxAttribute) {
            this.reportFailure(node);
        }
        super.visitFunctionExpression(node);
    }

    protected visitArrowFunction(node: ts.ArrowFunction) {
        if (this.isInJsxAttribute) {
            this.reportFailure(node);
        }
        super.visitArrowFunction(node);
    }

    private reportFailure(node: ts.Node) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING));
    }
}
