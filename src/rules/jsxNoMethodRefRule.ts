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
import {
    isJsxAttribute,
    isJsxExpression,
    isMethodDeclaration,
    isParenthesizedExpression,
    isPropertyAccessExpression,
} from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.TypedRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-no-method-ref",
        description: Lint.Utils.dedent
            `Forbids method references in jsx attributes.`,
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Method references are forbidden in JSX attributes";

    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {
        const checker = program.getTypeChecker();
        const walk = (ctx: Lint.WalkContext<void>) => {
            return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
                if (!isJsxAttribute(node)) {
                    return ts.forEachChild(node, cb);
                }

                const initializer = node.initializer;
                if (initializer === undefined || !isJsxExpression(initializer)) {
                    return;
                }

                const { expression } = initializer;

                if (expression === undefined) {
                    return;
                }

                const propertyAccess = getPropertyAccessExpression(expression);
                if (propertyAccess === undefined) {
                    return;
                }

                const symbol = checker.getSymbolAtLocation(propertyAccess);
                if (symbol === undefined) {
                    return;
                }
                const valueDeclaration = symbol.valueDeclaration;
                if (valueDeclaration === undefined || !isMethodDeclaration(valueDeclaration)) {
                    return;
                }
                return ctx.addFailureAtNode(propertyAccess, Rule.FAILURE_STRING);
            });
        };

        return this.applyWithFunction(sourceFile, walk);
    }
}

function getPropertyAccessExpression(node: ts.Node): ts.PropertyAccessExpression | undefined {
    if (isPropertyAccessExpression(node)) {
        return node;
    }

    if (isParenthesizedExpression(node)) {
        return getPropertyAccessExpression(node.expression);
    }

    return undefined;
}
