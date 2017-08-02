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
import * as ts from "typescript";

export function isMultilineText(text: string): boolean {
    return /\n/.test(text);
}

export function getDeleteFixForSpaceBetweenTokens(
    firstNode: ts.Node,
    secondNode: ts.Node,
): Lint.Replacement | undefined {
    const { parent } = firstNode;
    const parentStart = parent!.getStart();
    const secondNodeStart = secondNode.getFullStart();
    const firstNodeEnd = firstNode.getStart() + firstNode.getWidth();
    const secondNodeRelativeStart = secondNodeStart - parentStart;
    const firstNodeRelativeEnd = firstNodeEnd - parentStart;
    const parentText = parent!.getText();
    const trailingComments = ts.getTrailingCommentRanges(parentText, firstNodeRelativeEnd);
    const leadingComments = ts.getLeadingCommentRanges(parentText, secondNodeRelativeStart);
    // tslint:disable-next-line strict-boolean-expressions
    const comments = (trailingComments || []).concat(leadingComments || []);

    if (secondNode.getStart() - firstNode.getStart() - firstNode.getWidth() > getTotalCharCount(comments)) {
        const replacements = comments.map((comment) => parentText.slice(comment.pos, comment.end)).join("");
        return new Lint.Replacement(secondNodeStart, secondNode.getStart() - secondNodeStart, replacements);
    } else {
        return undefined;
    }
}

function getTotalCharCount(comments: ts.CommentRange[]) {
    return comments
        .map((comment) => comment.end - comment.pos)
        .reduce((l, r) => l + r, 0);
}
