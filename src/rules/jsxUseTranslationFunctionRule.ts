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
import { isJsxAttribute, isJsxElement, isJsxExpression, isJsxText, isStringLiteral } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    public static TRANSLATABLE_ATTRIBUTES = new Set(["placeholder", "title", "alt"]);
    public static FAILURE_STRING = "String literals are disallowed as JSX. Use a translation function";
    public static FAILURE_STRING_FACTORY = (text: string) =>
        `String literal is not allowed for value of ${text}. Use a translation function`

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>) {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxElement(node)) {
            for (const child of node.children) {
                if (isJsxText(child) && child.getText().trim() !== "") {
                    ctx.addFailureAtNode(child, Rule.FAILURE_STRING);
                }
                if (isJsxExpression(child)
                    && child.expression !== undefined
                    && (isStringLiteral(child.expression)
                        || child.expression.kind === ts.SyntaxKind.FirstTemplateToken)) {
                    ctx.addFailureAtNode(child, Rule.FAILURE_STRING);
                }
            }
        } else if (isJsxAttribute(node)) {
            if (Rule.TRANSLATABLE_ATTRIBUTES.has(node.name.text) && node.initializer) {
                if (isStringLiteral(node.initializer)
                    || (isJsxExpression(node.initializer) && isStringLiteral(node.initializer.expression!))) {
                    ctx.addFailureAtNode(node.initializer, Rule.FAILURE_STRING_FACTORY(node.name.text));
                }
            }
        }
        return ts.forEachChild(node, cb);
    });
}
