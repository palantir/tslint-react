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
import { isIdentifier, isJsxAttribute } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

interface IRuleOptions {
    /** Map from banned prop name -> its explanatory message */
    bannedProps: Map<string, string | string>;
}

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-ban-props",
        description: "Bans the use of specific props.",
        optionsDescription: Lint.Utils.dedent`
            A list of \`['propName', 'optional explanation here']\` which bans the prop called 'propName'.`,
        options: {
            type: "list",
            listType: {
                type: "string",
                items: {type: "string"},
                minLength: 1,
                maxLength: 2,
            },
        },
        optionExamples: [`[true, ["someProp], ["anotherProp", "Optional explanation"]]`],
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING_FACTORY = (propName: string, explanation?: string) => {
        const explanationSuffix = explanation === undefined || explanation === "" ? "" : ` ${explanation}`;
        return `Use of the prop '${propName}' is not allowed.${explanationSuffix}`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const bannedProps = this.ruleArguments.length > 0
            ? new Map(this.ruleArguments.map((prop: string[]): [string, string] =>
                [prop[0], prop.length > 1 ? prop[1] : ""]))
            : new Map();
        return this.applyWithFunction(sourceFile, walk, { bannedProps });
    }
}

function walk(ctx: Lint.WalkContext<IRuleOptions>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxAttribute(node)) {
            return ts.forEachChild(node, visitorInJsxAttribute);
        } else {
            return ts.forEachChild(node, cb);
        }
    });

    function visitorInJsxAttribute(node: ts.Node): void {
        if (isIdentifier(node)) {
            const propName = node.text;
            if (ctx.options.bannedProps.has(propName)) {
                const propBanExplanation = ctx.options.bannedProps.get(propName);
                ctx.addFailureAtNode(node, Rule.FAILURE_STRING_FACTORY(propName, propBanExplanation));
            }
        }
    }
}
