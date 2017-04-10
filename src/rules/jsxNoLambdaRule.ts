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

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "Lambdas are forbidden in JSX attributes due to their rendering performance impact";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>) {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        // continue iterations until JsxAttribute will be found
        if (node.kind === ts.SyntaxKind.JsxAttribute) {
            const initializer = (node as ts.JsxAttribute).initializer;

            // early exit in case when initializer is string literal or not provided (e.d. `disabled`)
            if (!initializer || initializer.kind !== ts.SyntaxKind.JsxExpression) {
                return;
            }

            const expression = (initializer as ts.JsxExpression).expression;

            if (expression && isLambda(expression)) {
                return ctx.addFailureAtNode(expression, Rule.FAILURE_STRING);
            }
        }

        return ts.forEachChild(node, cb);
    });
}

function isLambda(node: ts.Node): boolean {
    switch (node.kind) {
        case ts.SyntaxKind.FunctionExpression:
        case ts.SyntaxKind.ArrowFunction:
            return true;

        case ts.SyntaxKind.ParenthesizedExpression:
            return isLambda((node as ts.ParenthesizedExpression).expression);

        default:
            return false;
    }
}
