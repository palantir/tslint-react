/**
 * @license
 * Copyright 2019 Palantir Technologies, Inc.
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
    isJsxElement,
    isJsxFragment,
    isJsxOpeningFragment,
    isJsxSelfClosingElement,
    isJsxText,
} from "tsutils/typeguard/3.0";
import * as ts from "typescript";

const FRAGMENT_TAGNAME = "Fragment";
const REACT_FRAGEMNT_TAGNAME = "React.Fragment";

export class Rule extends Lint.Rules.AbstractRule {
    public static metadata: Lint.IRuleMetadata = {
        description: Lint.Utils.dedent`
            Warn if unnecessary fragment is used'
        `,
        optionExamples: ["true"],
        options: null,
        optionsDescription: "",
        ruleName: "react-no-unnecessary-fragment",
        type: "style",
        typescriptOnly: false,
    };

    public static FAILURE_STRING = "Unnecessary Fragment are forbidden";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (
            (isJsxFragment(node) && isJsxOpeningFragment(node.openingFragment)) ||
            (isJsxElement(node) && isJSXFragmentElement(node.openingElement))
        ) {
            let numValidChildren = 0;

            for (const child of node.children) {
                if (isJsxText(child)) {
                    if (!isInvalidJSXText(child)) {
                        numValidChildren += 1;
                    }
                } else {
                    numValidChildren += 1;
                }

                if (numValidChildren > 1) {
                    break;
                }
            }

            if (numValidChildren <= 1) {
                ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
            }

        } else if (isJsxSelfClosingElement(node) && isJSXFragmentElement(node)) {
            ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
        }

        return ts.forEachChild(node, cb);
    });
}

function isJSXFragmentElement(node: ts.JsxSelfClosingElement | ts.JsxOpeningElement): boolean {
    if (
        node.tagName.getText() === FRAGMENT_TAGNAME ||
        node.tagName.getText() === REACT_FRAGEMNT_TAGNAME
    ) {
        return true;
    }

    return false;
}

function isInvalidJSXText(node: ts.JsxText): boolean {
    return node.getText().trim() === "" ? true : false;
}
