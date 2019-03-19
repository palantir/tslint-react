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
import { isJsxAttribute } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-boolean-value",
        description: "Enforce boolean attribute notation in jsx.",
        optionsDescription: Lint.Utils.dedent`
            One of the following two options must be provided:
            * \`"${OPTION_ALWAYS}"\` requires JSX boolean values to always be set.
            * \`"${OPTION_NEVER}"\` prevents JSX boolean values to be explicity set as \`true\``,
        options: {
            type: "array",
            items: [{
                enum: [OPTION_ALWAYS, OPTION_NEVER],
                type: "string",
            }],
            minLength: 1,
            maxLength: 1,
        },
        optionExamples: [
            `[true, "${OPTION_ALWAYS}"]`,
            `[true, "${OPTION_NEVER}"]`,
        ],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static NEVER_MESSAGE = `Value must be omitted for boolean attributes`;
    public static ALWAYS_MESSAGE = `Value must be set for boolean attributes`;

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const option = Array.isArray(this.ruleArguments) ? this.ruleArguments[0] : undefined;
        return this.applyWithFunction(sourceFile, walk, option);
    }
}

function walk(ctx: Lint.WalkContext<string | undefined>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxAttribute(node)) {
            const { initializer } = node;

            if (initializer === undefined) {
                // if no option set, or explicitly set to "always"
                if (ctx.options === undefined || ctx.options === OPTION_ALWAYS) {
                    const text = node.name.text;
                    const width = text.length;
                    const start = node.end - width;
                    const fix = Lint.Replacement.replaceFromTo(start, node.end, `${text}={true}`);
                    ctx.addFailureAt(start, width, Rule.ALWAYS_MESSAGE, fix);
                }
            } else if (initializer.kind === ts.SyntaxKind.JsxExpression) {
                const isValueTrue = initializer.expression !== undefined
                    && initializer.expression.kind === ts.SyntaxKind.TrueKeyword;

                if (isValueTrue && ctx.options === OPTION_NEVER) {
                    const width = node.getWidth(ctx.sourceFile);
                    const start = node.end - width;
                    const fix = Lint.Replacement.replaceFromTo(
                        start, node.end, node.getFirstToken(ctx.sourceFile)!.getText(ctx.sourceFile));
                    ctx.addFailureAt(start, width, Rule.NEVER_MESSAGE, fix);
                }
            }
        }
        return ts.forEachChild(node, cb);
    });
}
