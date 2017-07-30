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
    getNextToken,
    isJsxAttribute,
    isJsxOpeningElement,
    isJsxSelfClosingElement,
    isJsxSpreadAttribute,
} from "tsutils";
import * as ts from "typescript";

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
        ruleName: "jsx-equals-spacing",
        description: Lint.Utils.dedent
            `Disallow or enforce spaces around equal signs in JSX attributes`,
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
        optionsDescription: Lint.Utils.dedent`
            One of the following two options must be provided:

            * \`"${OPTION_NEVER}"\` requires JSX attributes to NOT have spaces before and after the equals sign`,
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_REQUIRED_SPACE_BEFORE = `A space is required before '='`;
    public static FAILURE_REQUIRED_SPACE_AFTER = `A space is required after '='`;
    public static FAILURE_FORBIDDEN_SPACE_BEFORE = `There should be no space before '='`;
    public static FAILURE_FORBIDDEN_SPACE_AFTER = `There should be no space after '='`;

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const option = Array.isArray(this.ruleArguments) ? this.ruleArguments[0] : undefined;
        return this.applyWithFunction(sourceFile, walk, option);
    }
}

function getTotalCharCount(comments: ts.CommentRange[]) {
    return comments
        .map((comment) => comment.end - comment.pos)
        .reduce((l, r) => l + r, 0);
}

function hasEqual(attrNode: ts.Node) {
    return !isJsxSpreadAttribute(attrNode) && attrNode.getFullText() !== null;
}

function isSpaceBetweenTokens(firstNode: ts.Node, secondNode: ts.Node) {
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
        return new Lint.Replacement(secondNodeStart, secondNode.getStart() - secondNodeStart, replacements);
    } else {
        return undefined;
    }
}

function validateSpacing(attribute: ts.JsxAttribute, ctx: Lint.WalkContext<string | undefined>) {
    if (!attribute.initializer) {
        return;
    }

    const equalToken = getNextToken(attribute.name);
    if (!equalToken) {
        return;
    }

    const spacedBefore = isSpaceBetweenTokens(attribute.name, equalToken);
    const spacedAfter = isSpaceBetweenTokens(equalToken, attribute.initializer);

    if (ctx.options === OPTION_ALWAYS) {
        if (!spacedBefore) {
            const fix = Lint.Replacement.appendText(equalToken.getFullStart(), " ");

            ctx.addFailureAt(equalToken.getStart(), 1, Rule.FAILURE_REQUIRED_SPACE_BEFORE, fix);
        }

        if (!spacedAfter) {
            const fix = Lint.Replacement.appendText(attribute.initializer.getFullStart(), " ");

            ctx.addFailureAt(equalToken.getEnd(), 1, Rule.FAILURE_REQUIRED_SPACE_AFTER, fix);
        }
    } else if (ctx.options === OPTION_NEVER) {
        if (spacedBefore) {
            ctx.addFailureAt(equalToken.getStart() - 1, 1, Rule.FAILURE_FORBIDDEN_SPACE_BEFORE, spacedBefore);
        }

        if (spacedAfter) {
            ctx.addFailureAt(equalToken.getEnd(), 1, Rule.FAILURE_FORBIDDEN_SPACE_AFTER, spacedAfter);
        }
    }
}

function walk(ctx: Lint.WalkContext<string | undefined>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) {
            node.attributes.forEachChild((attribute) => {
                if (!hasEqual(attribute)) {
                    return;
                } else if (isJsxAttribute(attribute)) {
                    validateSpacing(attribute, ctx);
                }
            });
        }

        return ts.forEachChild(node, cb);
    });
}
