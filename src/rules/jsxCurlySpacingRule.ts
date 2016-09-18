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

import * as Lint from "tslint/lib/lint";
import * as ts from "typescript";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";
const SPACING_VALUES = [OPTION_ALWAYS, OPTION_NEVER];
/* tslint:disable:object-literal-sort-keys */
const SPACING_OBJECT = {
    type: "string",
    enum: SPACING_VALUES,
};
/* tslint:enable:object-literal-sort-keys */

function isExpressionMultiline(text: string) {
            return /\n/.test(text.replace(/\/\*.*?\*\//g, ""));
        }

function getTokensCombinedText(firstToken: ts.Node, nextToken: ts.Node) {
    const parentNodeText = nextToken.parent.getText();
    const firstTokenText = firstToken.getText();
    const secondTokenText = nextToken.getText();
    const secondTokenTextLocation = parentNodeText.indexOf(secondTokenText);
    const firstTokenTextLocation = parentNodeText.indexOf(firstTokenText);
    const combinedTokeText = parentNodeText.slice(
        firstTokenTextLocation,
        secondTokenTextLocation + secondTokenText.length);

    return combinedTokeText;
}

function isSpaceBetweenTokens(first: ts.Node, second: ts.Node) {
    const text = first.parent.getText().slice(
        first.end - first.parent.getStart(),
        second.getStart() - second.parent.getStart());

    return /\s/.test(text.replace(/\/\*.*?\*\//g, ""));
}

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
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_NO_ENDING_SPACE = (tokenStr: string) => {
        return `A space is required before ${tokenStr}`;
    };

    public static FAILURE_NO_BEGINNING_SPACE = (tokenStr: string) => {
        return `A space is required after ${tokenStr}`;
    };

    public static FAILURE_FORBIDDEN_SPACES_BEGINNING = (tokenStr: string) => {
        return `There should be no space after ${tokenStr}`;
    };

    public static FAILURE_FORBIDDEN_SPACES_END = (tokenStr: string) => {
        return `There should be no space before ${tokenStr}`;
    };

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxCurlySpacingWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class JsxCurlySpacingWalker extends Lint.RuleWalker {
    protected visitJsxExpression(node: ts.JsxExpression) {
        this.validateBraceSpacing(node);

        super.visitJsxExpression(node);
    }

    protected visitNode(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.JsxSpreadAttribute) {
            this.validateBraceSpacing(node);
        }

        super.visitNode(node);
    }

    private validateBraceSpacing(node: ts.Node) {
        const firstToken = node.getFirstToken();
        const secondToken = node.getChildAt(1);
        const lastToken = node.getLastToken();
        const secondToLastToken = node.getChildAt(node.getChildCount() - 2);
        const nodeStart = node.getStart();
        const nodeWidth = node.getWidth();

        if (this.hasOption(OPTION_ALWAYS)) {
            if (!isSpaceBetweenTokens(firstToken, secondToken)) {
                let failureString = Rule.FAILURE_NO_BEGINNING_SPACE(firstToken.getText());

                this.addFailure(this.createFailure(nodeStart, 1, failureString));
            }

            if (!isSpaceBetweenTokens(secondToLastToken, lastToken)) {
                let failureString = Rule.FAILURE_NO_ENDING_SPACE(lastToken.getText());

                this.addFailure(this.createFailure(nodeStart +  nodeWidth - 1, 1, failureString));
            }
        } else if (this.hasOption(OPTION_NEVER)) {
            const firstAndSecondTokensCombinedText = getTokensCombinedText(firstToken, secondToken);
            const lastAndSecondToLastCombinedText = getTokensCombinedText(secondToLastToken, lastToken);

            if (!isExpressionMultiline(firstAndSecondTokensCombinedText)) {
                if (isSpaceBetweenTokens(firstToken, secondToken)) {
                    let failureString = Rule.FAILURE_FORBIDDEN_SPACES_BEGINNING(firstToken.getText());

                    this.addFailure(this.createFailure(nodeStart, 1, failureString));
                }
            }

            if (!isExpressionMultiline(lastAndSecondToLastCombinedText)) {
                if (isSpaceBetweenTokens(secondToLastToken, lastToken)) {
                    let failureString = Rule.FAILURE_FORBIDDEN_SPACES_END(lastToken.getText());

                    this.addFailure(this.createFailure(nodeStart +  nodeWidth - 1, 1, failureString));
                }
            }
        }
    }
}
