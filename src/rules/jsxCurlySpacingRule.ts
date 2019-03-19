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
import { isJsxExpression, isJsxSpreadAttribute } from "tsutils/typeguard/3.0";
import * as ts from "typescript";
import { getDeleteFixForSpaceBetweenTokens, isMultilineText } from "../utils";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";
const SPACING_VALUES = [OPTION_ALWAYS, OPTION_NEVER];
const SPACING_OBJECT = {
    enum: SPACING_VALUES,
    type: "string",
};

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-curly-spacing",
        description: "Checks JSX curly braces spacing",
        optionsDescription: Lint.Utils.dedent`
            One of the following two options must be provided:

            * \`"${OPTION_ALWAYS}"\` requires JSX attributes to have spaces between curly braces
            * \`"${OPTION_NEVER}"\` requires JSX attributes to NOT have spaces between curly braces`,
        options: {
            type: "array",
            items: [SPACING_OBJECT],
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

    public static FAILURE_NO_ENDING_SPACE = (token: string) => `A space is required before ${token}`;
    public static FAILURE_NO_BEGINNING_SPACE = (token: string) => `A space is required after ${token}`;
    public static FAILURE_FORBIDDEN_SPACES_BEGINNING = (token: string) => `There should be no space after ${token}`;
    public static FAILURE_FORBIDDEN_SPACES_END = (token: string) => `There should be no space before ${token}`;

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const option = Array.isArray(this.ruleArguments) ? this.ruleArguments[0] : undefined;
        return this.applyWithFunction(sourceFile, walk, option);
    }
}

function walk(ctx: Lint.WalkContext<string | undefined>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxExpression(node) || isJsxSpreadAttribute(node)) {
            validateBraceSpacing(node);
        }
        return ts.forEachChild(node, cb);
    });

    function validateBraceSpacing(node: ts.Node) {
        const firstToken = node.getFirstToken()!;
        const secondToken = node.getChildAt(1);
        const lastToken = node.getLastToken()!;
        const secondToLastToken = node.getChildAt(node.getChildCount() - 2);
        const nodeStart = node.getStart();
        const nodeWidth = node.getWidth();

        if (ctx.options === OPTION_ALWAYS) {
            let deleteFix = getDeleteFixForSpaceBetweenTokens(firstToken, secondToken);
            if (deleteFix === undefined) {
                const fix = Lint.Replacement.appendText(secondToken.getFullStart(), " ");
                const failureString = Rule.FAILURE_NO_BEGINNING_SPACE(firstToken.getText());
                ctx.addFailureAt(nodeStart, 1, failureString, fix);
            }

            deleteFix = getDeleteFixForSpaceBetweenTokens(secondToLastToken, lastToken);
            if (deleteFix === undefined) {
                const fix = Lint.Replacement.appendText(lastToken.getStart(), " ");
                const failureString = Rule.FAILURE_NO_ENDING_SPACE(lastToken.getText());
                ctx.addFailureAt(nodeStart + nodeWidth - 1, 1, failureString, fix);
            }
        } else if (ctx.options === OPTION_NEVER) {
            const firstAndSecondTokensCombinedText = getTokensCombinedText(firstToken, secondToken);
            const lastAndSecondToLastCombinedText = getTokensCombinedText(secondToLastToken, lastToken);

            if (!isMultilineText(firstAndSecondTokensCombinedText)) {
                const fix = getDeleteFixForSpaceBetweenTokens(firstToken, secondToken);
                if (fix !== undefined) {
                    const failureString = Rule.FAILURE_FORBIDDEN_SPACES_BEGINNING(firstToken.getText());
                    ctx.addFailureAt(nodeStart, 1, failureString, fix);
                }
            }

            if (!isMultilineText(lastAndSecondToLastCombinedText)) {
                const fix = getDeleteFixForSpaceBetweenTokens(secondToLastToken, lastToken);
                if (fix !== undefined) {
                    const failureString = Rule.FAILURE_FORBIDDEN_SPACES_END(lastToken.getText());
                    // degenerate case when firstToken is the same as the secondToLastToken as we would
                    // have already queued up a fix in the previous branch, do not apply fix
                    if (firstToken === secondToLastToken) {
                        ctx.addFailureAt(nodeStart + nodeWidth - 1, 1, failureString);
                    } else {
                        ctx.addFailureAt(nodeStart + nodeWidth - 1, 1, failureString, fix);
                    }
                }
            }
        }
    }
}

function getTokensCombinedText(firstToken: ts.Node, nextToken: ts.Node) {
    const parent = nextToken.parent!;
    const combinedTokeText = parent.getText().slice(
        firstToken.getStart() - parent.getStart(),
        nextToken.getStart() + nextToken.getWidth() - parent.getStart(),
    );

    return combinedTokeText;
}
