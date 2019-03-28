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
import { isJsxAttribute, isJsxExpression, isStringLiteral, isTextualLiteral } from "tsutils";
import * as ts from "typescript";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";
const CURLY_PRESENCE_VALUES = [OPTION_ALWAYS, OPTION_NEVER];
const CURLY_PRESENCE_OBJECT = {
    enum: CURLY_PRESENCE_VALUES,
    type: "string",
};

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-curly-brace-presence",
        description: "Enforce curly braces or disallow unnecessary curly braces in JSX props",
        hasFix: true,
        optionsDescription: Lint.Utils.dedent`
One of the following options may be provided under the "props" key:

* \`"${OPTION_ALWAYS}"\` requires JSX attributes to have curly braces around string literal values
* \`"${OPTION_NEVER}"\` requires JSX attributes to NOT have curly braces around string literal values

If no option is provided, "${OPTION_NEVER}" is chosen as default.`,
        options: {
            type: "object",
            properties: {
                props: CURLY_PRESENCE_OBJECT,
            },
        },
        optionExamples: [
            `{ props: "${OPTION_ALWAYS}" }`,
            `{ props: "${OPTION_NEVER}" }`,
        ],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_CURLY_BRACE_SUPERFLUOUS = "JSX attribute must NOT have curly braces around string literal";
    public static FAILURE_CURLY_BRACE_MISSING = "JSX attribute must have curly braces around string literal";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const option = Array.isArray(this.ruleArguments) ? this.ruleArguments[0] : undefined;

        return this.applyWithFunction(sourceFile, walk, option);
    }
}

function walk(ctx: Lint.WalkContext<{ props: string } | undefined>): void {
    return ts.forEachChild(ctx.sourceFile, validateCurlyBraces);

    function validateCurlyBraces(node: ts.Node): void {
        if (isJsxAttribute(node)) {
            if (typeof ctx.options === "object" && ctx.options.props === OPTION_ALWAYS) {
                validateCurlyBracesArePresent(node);
            } else {
                validateCurlyBracesAreNotPresent(node);
            }
        }
        return ts.forEachChild(node, validateCurlyBraces);
    }

    function validateCurlyBracesArePresent(node: ts.JsxAttribute) {
        const { initializer } = node;
        if (initializer !== undefined) {
            const hasStringInitializer = initializer.kind === ts.SyntaxKind.StringLiteral;
            if (hasStringInitializer) {
                const fix = Lint.Replacement.replaceNode(initializer, `{${initializer.getText()}}`);
                ctx.addFailureAtNode(initializer, Rule.FAILURE_CURLY_BRACE_MISSING, fix);
            }
        }
    }

    function validateCurlyBracesAreNotPresent(node: ts.JsxAttribute) {
        const { initializer } = node;
        if (initializer !== undefined
            && isJsxExpression(initializer)
            && initializer.expression !== undefined) {
            if (isStringLiteral(initializer.expression)) {
                const stringLiteralWithoutCurlies: string = initializer.expression.getText();
                const fix = Lint.Replacement.replaceNode(initializer, stringLiteralWithoutCurlies);
                ctx.addFailureAtNode(initializer, Rule.FAILURE_CURLY_BRACE_SUPERFLUOUS, fix);
            } else if (isTextualLiteral(initializer.expression)) {
                const textualLiteralContent = initializer.expression.text;
                const fix = Lint.Replacement.replaceNode(initializer, `"${textualLiteralContent}"`);
                ctx.addFailureAtNode(initializer, Rule.FAILURE_CURLY_BRACE_SUPERFLUOUS, fix);
            }
        }
    }
}
