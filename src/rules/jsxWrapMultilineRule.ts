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
import { isJsxElement, isJsxSelfClosingElement } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-wrap-multiline",
        description: "Checks that multiline JSX elements are wrapped in parens",
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_NOT_WRAPPED =
        "Multiline JSX elements must be wrapped in parentheses";
    public static FAILURE_MISSING_NEW_LINE_AFTER_OPEN =
        "New line required after open parenthesis when wrapping multiline JSX elements";
    public static FAILURE_MISSING_NEW_LINE_BEFORE_CLOSE =
        "New line requred before close parenthesis when wrapping multiline JSX elements";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new JsxWrapMultilineWalker(sourceFile, this.ruleName, undefined));
    }
}

class JsxWrapMultilineWalker extends Lint.AbstractWalker<void> {
    private scanner?: ts.Scanner;

    public walk(sourceFile: ts.SourceFile) {
        const cb = (node: ts.Node): void => {
            if (isJsxElement(node) || isJsxSelfClosingElement(node)) {
                this.checkNode(node, sourceFile);
            } else {
                return ts.forEachChild(node, cb);
            }
        };

        return ts.forEachChild(sourceFile, cb);
    }

    private checkNode(node: ts.JsxElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile) {
        const startLine = this.getLine(node.getStart(this.sourceFile));
        const endLine = this.getLine(node.getEnd());

        if (startLine === endLine) {
            return;
        }

        if (node.parent == null) {
            this.addFailureAtNode(node, Rule.FAILURE_NOT_WRAPPED);
            return;
        }

        if (node.parent.kind === ts.SyntaxKind.JsxElement) {
            return;
        }

        const scanner = this.getScanner(sourceFile);
        scanner.setTextPos(node.getFullStart() - 1);
        const prevTokenKind = scanner.scan();
        const siblings = node.parent.getChildren(sourceFile);
        const index = siblings.indexOf(node);

        const previousToken = siblings[index - 1];
        const nextToken = siblings[index + 1];

        if (prevTokenKind === ts.SyntaxKind.OpenParenToken && node.getFullText().match(/^[\r\n]+/)) {
            return;
        }

        if (nextToken == null || nextToken.kind !== ts.SyntaxKind.CloseParenToken) {
            this.addFailureAtNode(node, Rule.FAILURE_NOT_WRAPPED);
            return;
        }

        const startParenLine = this.getLine(previousToken.getStart(sourceFile));
        if (startParenLine === startLine) {
            this.addFailureAtNode(previousToken, Rule.FAILURE_MISSING_NEW_LINE_AFTER_OPEN);
        }

        const endParenLine = this.getLine(nextToken.getStart(sourceFile));
        if (endParenLine === endLine) {
            this.addFailureAtNode(nextToken, Rule.FAILURE_MISSING_NEW_LINE_BEFORE_CLOSE);
        }
    }

    private getScanner(sourceFile: ts.SourceFile): ts.Scanner {
        if (this.scanner === undefined) {
            this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
        }
        return this.scanner;
    }

    private getLine(position: number) {
        return this.getSourceFile().getLineAndCharacterOfPosition(position).line;
    }
}
