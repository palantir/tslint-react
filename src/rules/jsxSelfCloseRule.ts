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
import { isJsxElement } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-self-close",
        description: "Checks that JSX elements with no children are self-closing",
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "JSX elements with no children must be self-closing";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxElement(node)) {
            const missingOpeningOrClosingTag = node.openingElement == null || node.closingElement == null;
            // The last part of the textIsEmpty assignment is to check whether the tag is completely empty or
            // only consists of spaces/new lines.
            const textIsEmpty = node.children.length === 1
                && node.children[0].kind === ts.SyntaxKind.JsxText
                && node.children[0].getText() === "";
            const noChildren = node.children.length === 0 || textIsEmpty;

            if (!missingOpeningOrClosingTag && noChildren) {
                const openingElementText = node.openingElement.getFullText();
                const selfClosingNode = openingElementText.slice(0, openingElementText.lastIndexOf(">")) + "/>";
                const fix = new Lint.Replacement(node.getStart(), node.getWidth(), selfClosingNode);

                ctx.addFailureAtNode(node, Rule.FAILURE_STRING, fix);
            } else if (noChildren) {
                ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
            }
        }
        return ts.forEachChild(node, cb);
    });
}
