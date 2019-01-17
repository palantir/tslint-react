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
import { isCallExpression, isPropertyAccessExpression } from "tsutils";
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

    public static FAILURE_STRING = "Avoid using this.state in first argument of setState.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, callbackForEachChild);

    function callbackForEachChild(node: ts.Node): void {
        if (!isCallExpression(node)) {
            return ts.forEachChild(node, callbackForEachChild);
        }

        const isSetStateCall = node.expression.getText().startsWith("this.setState");
        if (!isSetStateCall || node.arguments.length === 0) {
            return ts.forEachChild(node, callbackForEachChild);
        }

        ts.forEachChild(node.arguments[0], callbackForEachChildInSetStateArgument);
        return;
    }

    function callbackForEachChildInSetStateArgument(node: ts.Node): void {
        if (!isPropertyAccessExpression(node)) {
            return ts.forEachChild(node, callbackForEachChildInSetStateArgument);
        }

        if (!node.getText().startsWith("this.state.")) {
            return ts.forEachChild(node, callbackForEachChildInSetStateArgument);
        }

        ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
        return;
    }
}
