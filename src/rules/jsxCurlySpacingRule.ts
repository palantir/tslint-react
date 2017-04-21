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
import * as ts from "typescript";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";
const SPACING_VALUES = [OPTION_ALWAYS, OPTION_NEVER];
const SPACING_OBJECT = {
    enum: SPACING_VALUES,
    type: "string",
};
const NEWLINE_REGEX = /\n/;

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
        typescriptOnly: true,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_NO_ENDING_SPACE = (tokenStr: string) => {
        return `A space is required before ${tokenStr}`;
    }

    public static FAILURE_NO_BEGINNING_SPACE = (tokenStr: string) => {
        return `A space is required after ${tokenStr}`;
    }

    public static FAILURE_FORBIDDEN_SPACES_BEGINNING = (tokenStr: string) => {
        return `There should be no space after ${tokenStr}`;
    }

    public static FAILURE_FORBIDDEN_SPACES_END = (tokenStr: string) => {
        return `There should be no space before ${tokenStr}`;
    }

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
            let deleteFix = this.maybeGetDeleteFixForSpaceBetweenTokens(firstToken, secondToken);
            if (deleteFix === undefined) {
                const fix = this.appendText(secondToken.getFullStart(), " ");
                const failureString = Rule.FAILURE_NO_BEGINNING_SPACE(firstToken.getText());

                this.addFailure(this.createFailure(nodeStart, 1, failureString, fix));
            }

            deleteFix = this.maybeGetDeleteFixForSpaceBetweenTokens(secondToLastToken, lastToken);
            if (deleteFix === undefined) {
                const fix = this.appendText(lastToken.getStart(), " ");
                const failureString = Rule.FAILURE_NO_ENDING_SPACE(lastToken.getText());

                this.addFailure(this.createFailure(nodeStart + nodeWidth - 1, 1, failureString, fix));
            }
        } else if (this.hasOption(OPTION_NEVER)) {
            const firstAndSecondTokensCombinedText = getTokensCombinedText(firstToken, secondToken);
            const lastAndSecondToLastCombinedText = getTokensCombinedText(secondToLastToken, lastToken);

            if (!isExpressionMultiline(firstAndSecondTokensCombinedText)) {
                const fix = this.maybeGetDeleteFixForSpaceBetweenTokens(firstToken, secondToken);
                if (fix !== undefined) {
                    const failureString = Rule.FAILURE_FORBIDDEN_SPACES_BEGINNING(firstToken.getText());

                    this.addFailure(this.createFailure(nodeStart, 1, failureString, fix));
                }
            }

            if (!isExpressionMultiline(lastAndSecondToLastCombinedText)) {
                const fix = this.maybeGetDeleteFixForSpaceBetweenTokens(secondToLastToken, lastToken);
                if (fix !== undefined) {
                    const failureString = Rule.FAILURE_FORBIDDEN_SPACES_END(lastToken.getText());
                    // degenerate case when firstToken is the same as the secondToLastToken as we would
                    // have already queued up a fix in the previous branch, do not apply fix
                    const failure = firstToken === secondToLastToken
                        ? this.createFailure(nodeStart + nodeWidth - 1, 1, failureString)
                        : this.createFailure(nodeStart + nodeWidth - 1, 1, failureString, fix);
                    this.addFailure(failure);
                }
            }
        }
    }

    private maybeGetDeleteFixForSpaceBetweenTokens(firstNode: ts.Node, secondNode: ts.Node) {
        if (firstNode.parent !== secondNode.parent) {
            throw Error("Expected identical parents for both nodes");
        }

        const { parent } = firstNode;
        const parentStart = parent!.getStart();
        const secondNodeStart =  secondNode.getFullStart();
        const firstNodeEnd = firstNode.getStart() + firstNode.getWidth();
        const secondNodeRelativeStart = secondNodeStart - parentStart;
        const firstNodeRelativeEnd = firstNodeEnd - parentStart;
        const parentText = parent!.getText();
        const trailingComments = ts.getTrailingCommentRanges(parentText, firstNodeRelativeEnd) || [];
        const leadingComments = ts.getLeadingCommentRanges(parentText, secondNodeRelativeStart) || [];
        const comments = trailingComments.concat(leadingComments);

        if (secondNode.getStart() - firstNode.getStart() - firstNode.getWidth() > getTotalCharCount(comments)) {
            const replacements = comments.map((comment) => parentText.slice(comment.pos, comment.end)).join("");
            return this.createReplacement(secondNodeStart, secondNode.getStart() - secondNodeStart, replacements);
        } else {
            return undefined;
        }
    }
}

function isExpressionMultiline(text: string) {
    return NEWLINE_REGEX.test(text);
}

function getTokensCombinedText(firstToken: ts.Node, nextToken: ts.Node) {
    const parentNodeText = nextToken.parent!.getText();
    const firstTokenText = firstToken.getText();
    const secondTokenText = nextToken.getText();
    const secondTokenTextLocation = parentNodeText.indexOf(secondTokenText);
    const firstTokenTextLocation = parentNodeText.indexOf(firstTokenText);
    const combinedTokeText = parentNodeText.slice(
        firstTokenTextLocation,
        secondTokenTextLocation + secondTokenText.length,
    );

    return combinedTokeText;
}

function getTotalCharCount(comments: ts.CommentRange[]) {
    return comments
        .map((comment) => comment.end - comment.pos)
        .reduce((l, r) => l + r, 0);
}
