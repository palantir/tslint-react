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
import { isJsxAttribute, isJsxExpression, isStringLiteral, isTemplateExpression } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-no-string-ref",
        description: "Checks for string literal refs",
        descriptionDetails: "This syntax is deprecated and will be removed in a future version of React",
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Pass a callback to ref prop instead of a string literal";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxAttribute(node)) {
            const { name, initializer } = node;
            const isRefAttribute = name.text === "ref";

            if (isRefAttribute && initializer !== undefined) {
                const hasStringInitializer = initializer.kind === ts.SyntaxKind.StringLiteral;
                const hasStringExpressionInitializer = isJsxExpression(initializer)
                    && initializer.expression !== undefined
                    && (isStringLiteral(initializer.expression) || isTemplateExpression(initializer.expression));

                if (hasStringInitializer || hasStringExpressionInitializer) {
                    ctx.addFailureAtNode(initializer, Rule.FAILURE_STRING);
                }
            }
        }
        return ts.forEachChild(node, cb);
    });
}
