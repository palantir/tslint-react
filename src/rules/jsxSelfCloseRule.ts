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

import * as ts from "typescript";
import * as Lint from "tslint/lib/lint";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "JSX elements with no children must be self-closing";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxSelfCloseWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class JsxSelfCloseWalker extends Lint.RuleWalker {
    protected visitJsxElement(node: ts.JsxElement) {
        const missingOpeningOrClosingTag = node.openingElement == null || node.closingElement == null;
        // The last part of the textIsEmpty assignment is to check whether the tag is completely empty or
        // only consists of spaces/new lines.
        const textIsEmpty = node.children.length === 1
            && node.children[0].kind === ts.SyntaxKind.JsxText
            && node.children[0].getText() === "";
        const noChildren = node.children.length === 0 || textIsEmpty;

        if (missingOpeningOrClosingTag || noChildren) {
            this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING));
        }
        super.visitJsxElement(node);
    }
}
