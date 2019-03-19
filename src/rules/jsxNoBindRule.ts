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
import { isCallExpression, isJsxAttribute, isJsxExpression } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-no-bind",
        description: Lint.Utils.dedent
            `Forbids function binding in JSX attributes. This has the same intent \
            as jsx-no-lambda in helping you avoid excessive re-renders.`,
        descriptionDetails: Lint.Utils.dedent
            `Note that this currently only does a simple syntactic check, \
            not a semantic one (it doesn't use the type checker). So it may \
            have some rare false positives if you define your own .bind function \
            and supply this as a parameter.`,
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Binds are forbidden in JSX attributes due to their rendering performance impact";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        // This creates a WalkContext<T> and passes it in as an argument.
        // An optional 3rd parameter allows you to pass in a parsed version
        // of this.ruleArguments. If used, it is preferred to parse it into
        // a more useful object than this.getOptions().
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (!isJsxAttribute(node)) {
            return ts.forEachChild(node, cb);
        }

        const initializer = node.initializer;
        if (initializer === undefined || !isJsxExpression(initializer)) {
            return;
        }

        const { expression } = initializer;
        if (expression === undefined
            || !isCallExpression(expression)
            || !expression.getText(ctx.sourceFile).includes(".bind(this)")) {
            return;
        }

        return ctx.addFailureAtNode(expression, Rule.FAILURE_STRING);
    });
}
