/**
 * @license
 * Copyright 2019 Palantir Technologies, Inc.
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
import { isJsxAttribute, isJsxExpression, isStringLiteral} from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "some error";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, cb);

    function cb(node: ts.Node): void {
        if (isJsxAttribute(node)) {
            const { initializer} = node;

            if (initializer !== undefined) {
                // const hasStringInitializer = initializer.kind === ts.SyntaxKind.StringLiteral;
                const hasStringExpressionInitializer = isJsxExpression(initializer)
                    && initializer.expression !== undefined
                    && (isStringLiteral(initializer.expression));

                if (hasStringExpressionInitializer) {
                    ctx.addFailureAtNode(initializer, Rule.FAILURE_STRING);
                }
            }
        }
        return ts.forEachChild(node, cb);
    }
}
