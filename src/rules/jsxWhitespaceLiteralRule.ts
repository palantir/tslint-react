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
import { isJsxText } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

const RESERVED_ENTITY = "&nbsp;";

export class Rule extends Lint.Rules.AbstractRule {
    public static metadata: Lint.IRuleMetadata = {
        description: Lint.Utils.dedent`
            Warn if '&nbsp;' is used in JSX markup. Prefer {" "} over '&nbsp;'
        `,
        optionExamples: ["true"],
        options: null,
        optionsDescription: "",
        ruleName: "jsx-whitespace-literal",
        type: "functionality",
        typescriptOnly: false,
    };

    public static FAILURE_STRING = `Expected '{" "}' instead of '&nbsp;' in JSX markup`;

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxText(node)) {
            const text = node.getText();
            if (text.indexOf(RESERVED_ENTITY) > -1) {
                const regex = new RegExp(RESERVED_ENTITY, "g");
                const startIndices: number[] = [];
                const endIndices: number[] = [];
                let countEnitiy = -1;
                let result = regex.exec(text);

                while (result !== null) {
                    if (
                        startIndices[countEnitiy] !== undefined &&
                        endIndices[countEnitiy] !== undefined &&
                        startIndices[countEnitiy] + endIndices[countEnitiy] === result.index
                    ) {
                        endIndices[countEnitiy] = endIndices[countEnitiy] + RESERVED_ENTITY.length;
                    } else {
                        startIndices.push(result.index);
                        endIndices.push(RESERVED_ENTITY.length);
                        countEnitiy += 1;
                    }
                    result = regex.exec(text);
                }

                startIndices.forEach((startIndex, index) => {
                    const start = node.getStart() + startIndex;
                    const end = endIndices[index];
                    const spaces = " ".repeat(end / RESERVED_ENTITY.length);
                    const fix = Lint.Replacement.replaceFromTo(
                        start,
                        start + end,
                        `{"${spaces}"}`,
                    );

                    ctx.addFailureAt(start, end, Rule.FAILURE_STRING, fix);
                });
            }
        }

        return ts.forEachChild(node, cb);
    });
}
