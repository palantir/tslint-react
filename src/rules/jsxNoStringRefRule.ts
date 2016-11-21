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

import * as Lint from "tslint";
import * as ts from "typescript";

import { nodeIsKind } from "../guards";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "Pass a callback to ref prop instead of a string literal";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxNoStringRefWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class JsxNoStringRefWalker extends Lint.RuleWalker {
    protected visitNode(node: ts.Node) {
        if (nodeIsKind<ts.JsxAttribute>(node, ts.SyntaxKind.JsxAttribute)) {
            const { name, initializer } = node;
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
                        Rule.FAILURE_STRING,
                    ));
                }
            }
        }

        super.visitNode(node);
    }
}
