/**
 * @license
 * Copyright 2017 Palantir Technologies, Inc.
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
import {nodeIsKind} from "../guards";

export class Rule extends Lint.Rules.AbstractRule {
    public static TRANSLATABLE_ATTRIBUTES = new Set(["placeholder", "title", "alt"]);
    public static FAILURE_STRING = "String literals are disallowed as JSX attribute values. Use a translation function";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxUseTranslationFunctionWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class JsxUseTranslationFunctionWalker extends Lint.RuleWalker {
    public visitJsxElement(node: ts.JsxElement) {
        // TODO: replace this method with visitJsxText for simpler implementation
        for (const child of node.children) {
            if (nodeIsKind(child, ts.SyntaxKind.JsxText) && child.getText().trim() !== "") {
                this.addFailure(this.createFailure(child.getStart(), child.getWidth(), Rule.FAILURE_STRING));
            }
            if (nodeIsKind<ts.JsxExpression>(child, ts.SyntaxKind.JsxExpression)) {
                if (child.expression && child.expression.kind === ts.SyntaxKind.StringLiteral) {
                    this.addFailure(this.createFailure(child.getStart(), child.getWidth(), Rule.FAILURE_STRING));
                }
                if (child.expression && child.expression.kind === ts.SyntaxKind.FirstTemplateToken) {
                    this.addFailure(this.createFailure(child.getStart(), child.getWidth(), Rule.FAILURE_STRING));
                }
            }
        }
        super.visitJsxElement(node);
    }

    public visitJsxAttribute(node: ts.JsxAttribute) {
        if (Rule.TRANSLATABLE_ATTRIBUTES.has(node.name.text) && node.initializer) {
            if (nodeIsKind(node.initializer, ts.SyntaxKind.StringLiteral)) {
                this.addFailure(this.createFailure(
                    node.initializer.getStart(),
                    node.initializer.getWidth(),
                    Rule.FAILURE_STRING,
                ));
            }
            if (nodeIsKind<ts.JsxExpression>(node.initializer, ts.SyntaxKind.JsxExpression) &&
                nodeIsKind<ts.StringLiteral>(node.initializer.expression!, ts.SyntaxKind.StringLiteral)
            ) {
                    this.addFailure(this.createFailure(
                        node.initializer.getStart(),
                        node.initializer.getWidth(),
                        Rule.FAILURE_STRING,
                    ));
            }
        }
        super.visitJsxAttribute(node);
    }
}
