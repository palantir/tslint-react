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
    public static FAILURE = "Multiline JSX elements must be wrapped in parenthesis";

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
        if (!this.isParenthesised(node) && this.isMultiline(node)) {
            const sourceFile = this.getSourceFile();
            const failure = this.createFailure(
                node.getStart(sourceFile),
                node.getWidth(sourceFile),
                Rule.FAILURE,
            );
            this.addFailure(failure);
        }
    }

    private isParenthesised(node: ts.Node) {
        if (node.parent == null) {
            return false;
        }

        const siblings = node.parent.getChildren(this.getSourceFile());
        const index = siblings.indexOf(node);

        const previousToken = siblings[index - 1];
        const nextToken = siblings[index + 1];

        return previousToken != null
            && previousToken.kind === ts.SyntaxKind.OpenParenToken
            && nextToken != null
            && nextToken.kind === ts.SyntaxKind.CloseParenToken;
    }

    private isMultiline(node: ts.Node) {
        const startLine = this.getLine(node.getStart(this.getSourceFile()));
        const endLine = this.getLine(node.getEnd());

        return startLine !== endLine;
    }

    private getLine(position: number) {
        return this.getSourceFile().getLineAndCharacterOfPosition(position).line;
    }
}
