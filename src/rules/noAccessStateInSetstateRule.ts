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
import { isCallExpression } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "no-access-state-in-setstate",
        description: "Reports usage of this.state within setState",
        rationale: Lint.Utils.dedent
            `Usage of this.state might result in errors when two state calls are \
            called in batch and thus referencing old state and not the current state.`,
        options: null,
        optionsDescription: "",
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Use callback in setState when referencing the previous state.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, cb);

    function cb(node: ts.Node): void {
        if (!isCallExpression(node)) {
            return ts.forEachChild(node, cb);
        }
        if (isStateUsedInSetStateWith(node)) {
            ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
        }
        return;
    }
}

function isStateUsedInSetStateWith(callExpression: ts.CallExpression): boolean {
    if (callExpression.expression.getText() !== "this.setState") {
        return false;
    }
    if (callExpression.arguments.length === 0) {
        return false;
    }

    const firstCallExpressionArgument = callExpression.arguments[0];
    const argumentAsText = firstCallExpressionArgument.getText();
    return argumentAsText.indexOf("this.state.") !== -1;
}
