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

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_NOT_WRAPPED
        = "Multiline JSX elements must be wrapped in parentheses";
    public static FAILURE_MISSING_NEW_LINE_AFTER_OPEN
        = "New line required after open parenthesis when wrapping multiline JSX elements";
    public static FAILURE_MISSING_NEW_LINE_BEFORE_CLOSE
    = "New line requred before close parenthesis when wrapping multiline JSX elements";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new JsxWrapMultilineWalker(sourceFile, this.getOptions()));
    }
}

class JsxWrapMultilineWalker extends Lint.RuleWalker {
    protected visitJsxElement(node: ts.JsxElement) {
        this.checkNode(node);
        super.visitJsxElement(node);
    }

    protected visitJsxSelfClosingElement(node: ts.JsxSelfClosingElement) {
        this.checkNode(node);
        super.visitJsxSelfClosingElement(node);
    }

    private checkNode(node: ts.JsxElement | ts.JsxSelfClosingElement) {
        const sourceFile = this.getSourceFile();

        const startLine = this.getLine(node.getStart(sourceFile));
        const endLine = this.getLine(node.getEnd());

        if (startLine === endLine) {
            return;
        }

        if (node.parent == null) {
            this.addNotWrappedFailure(node);
            return;
        }

        if (node.parent.kind === ts.SyntaxKind.JsxElement) {
            return;
        }

        const siblings = node.parent.getChildren(sourceFile);
        const index = siblings.indexOf(node);

        const previousToken = siblings[index - 1];
        const nextToken = siblings[index + 1];

        if (
            previousToken == null
            || previousToken.kind !== ts.SyntaxKind.OpenParenToken
            || nextToken == null
            || nextToken.kind !== ts.SyntaxKind.CloseParenToken
        ) {
            this.addNotWrappedFailure(node);
            return;
        }

        const startParenLine = this.getLine(previousToken.getStart(sourceFile));
        if (startParenLine === startLine) {
            this.addFailureAtPositions(
                previousToken.getStart(sourceFile),
                node.getStart(sourceFile) - 1,
                Rule.FAILURE_MISSING_NEW_LINE_AFTER_OPEN,
            );
        }

        const endParenLine = this.getLine(nextToken.getStart(sourceFile));
        if (endParenLine === endLine) {
            this.addFailureAtPositions(
                node.getEnd(),
                nextToken.getStart(sourceFile),
                Rule.FAILURE_MISSING_NEW_LINE_BEFORE_CLOSE,
            );
        }
    }

    private addNotWrappedFailure(node: ts.JsxElement | ts.JsxSelfClosingElement) {
        const sourceFile = this.getSourceFile();
        const failure = this.createFailure(
            node.getStart(sourceFile),
            node.getWidth(sourceFile),
            Rule.FAILURE_NOT_WRAPPED,
        );
        this.addFailure(failure);
    }

    private addFailureAtPositions(start: number, end: number, message: string) {
        const failure = this.createFailure(start, end - start + 1, message);
        this.addFailure(failure);
    }

    private getLine(position: number) {
        return this.getSourceFile().getLineAndCharacterOfPosition(position).line;
    }
}
