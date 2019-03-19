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
import { isJsxSelfClosingElement } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-space-before-trailing-slash",
        description: "Checks that self-closing JSX elements have a space before the '/>' part.",
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Self-closing JSX elements must have a space before the '/>' part";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

const closingLength = "/>".length;
const isWhiteSpace = (char: string) => /\s/.test(char);
const hasWhitespaceBeforeClosing = (nodeText: string) =>
    isWhiteSpace(nodeText.charAt(nodeText.length - closingLength - 1));

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxSelfClosingElement(node)) {
            if (!hasWhitespaceBeforeClosing(node.getText(ctx.sourceFile))) {
                const fix = Lint.Replacement.appendText(node.getEnd() - closingLength, " ");
                ctx.addFailureAtNode(node, Rule.FAILURE_STRING, fix);
            }
        }
        return ts.forEachChild(node, cb);
    });
}
