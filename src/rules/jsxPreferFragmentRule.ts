/**
 * @license
 * Copyright 2018 Palantir Technologies, Inc.
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
import { isJsxOpeningElement } from "tsutils";
import * as ts from "typescript";

interface IOption {
    noSyntaxSugar: boolean;
}

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-prefer-fragment",
        description: Lint.Utils.dedent`
            Prefer React.Fragment over empty div`,
        options: {
            type: "array",
            items: {
                type: "string",
                enum: ["no-syntax-sugar"],
            },
        },
        optionsDescription: Lint.Utils.dedent`
            React.Fragment will be used instead of <> if no-syntax-sugar option is given`,
        optionExamples: [true, ["no-syntax-sugar"]],
        type: "style",
        typescriptOnly: false,
        hasFix: true,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING_FACTORY(elementName: string) {
        return `An empty '${elementName}' should be written as React.Fragment.`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk, {
            noSyntaxSugar: this.ruleArguments.indexOf("no-syntax-sugar") !== -1,
        });
    }
}

function walk(ctx: Lint.WalkContext<IOption>) {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxOpeningElement(node)) {
            const tagName = node.tagName.getText();

            if (tagName === "div" && node.attributes.properties.length === 0 && node.parent !== undefined) {
                const fragment = ctx.options.noSyntaxSugar ? "React.Fragment" : "";

                const fixes = [
                    Lint.Replacement.replaceFromTo(node.tagName.pos, node.tagName.end, fragment),
                    Lint.Replacement.replaceFromTo(
                        node.parent.closingElement.tagName.pos,
                        node.parent.closingElement.tagName.end,
                        fragment,
                    ),
                ];

                ctx.addFailureAtNode(node.tagName, Rule.FAILURE_STRING_FACTORY(tagName), fixes);
            }
        }
        return ts.forEachChild(node, cb);
    });
}
