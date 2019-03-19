/**
 * @license
 * Copyright 2018 Palantir Technologies, Inc.
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
import { isCallExpression, isClassDeclaration, isPropertyAccessExpression } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "no-access-state-in-setstate",
        description: "Reports usage of this.state within setState",
        rationale: Lint.Utils.dedent`
            Usage of this.state might result in errors when two state calls are
            called in batch and thus referencing old state and not the current state.
            See [setState()](https://reactjs.org/docs/react-component.html#setstate) in the React API reference.
        `,
        options: null,
        optionsDescription: "",
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static OBJECT_ARG_FAILURE =
        "References to this.state are not allowed in the setState state change object.";

    public static CALLBACK_ARG_FAILURE =
        "References to this.state are not allowed in the setState updater, use the callback arguments instead.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, callbackForEachChild);

    function callbackForEachChild(node: ts.Node): void {
        if (!isClassDeclaration(node)) {
            return;
        }

        ts.forEachChild(node, callbackForEachChildInClass);
    }

    function callbackForEachChildInClass(node: ts.Node): void {
        if (!isCallExpression(node)) {
            return ts.forEachChild(node, callbackForEachChildInClass);
        }

        const callExpressionArguments = node.arguments;

        if (!isPropertyAccessExpression(node.expression) || callExpressionArguments.length === 0) {
            return;
        }

        const propertyAccessExpression = node.expression;

        const isThisPropertyAccess = propertyAccessExpression.expression.kind === ts.SyntaxKind.ThisKeyword;
        const isSetStateCall = propertyAccessExpression.name.text === "setState";

        if (!isThisPropertyAccess || !isSetStateCall) {
            return;
        }

        const firstArgument = node.arguments[0];

        if (ts.isObjectLiteralExpression(firstArgument)) {
            ts.forEachChild(firstArgument, callbackForEachChildInSetStateObjectArgument);
        } else if (ts.isArrowFunction(firstArgument) || ts.isFunctionExpression(firstArgument)) {
            ts.forEachChild(firstArgument, callbackForEachChildInSetStateCallbackArgument);
        }
    }

    function callbackForEachChildInSetStateObjectArgument(node: ts.Node): void {
        if (!isPropertyAccessExpression(node) || !isPropertyAccessExpression(node.expression)) {
            return ts.forEachChild(node, callbackForEachChildInSetStateObjectArgument);
        }

        if (
            node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword ||
            node.expression.name.text !== "state"
        ) {
            return ts.forEachChild(node, callbackForEachChildInSetStateObjectArgument);
        }

        ctx.addFailureAtNode(node, Rule.OBJECT_ARG_FAILURE);
    }

    function callbackForEachChildInSetStateCallbackArgument(node: ts.Node): void {
        if (!isPropertyAccessExpression(node) || !isPropertyAccessExpression(node.expression)) {
            return ts.forEachChild(node, callbackForEachChildInSetStateCallbackArgument);
        }

        if (
            node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword ||
            node.expression.name.text !== "state"
        ) {
            return ts.forEachChild(node, callbackForEachChildInSetStateCallbackArgument);
        }

        ctx.addFailureAtNode(node, Rule.CALLBACK_ARG_FAILURE);
    }
}
