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
import { isJsxOpeningElement, isJsxSelfClosingElement } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

interface IOption {
    pattern: RegExp;
    message?: string;
}

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-ban-elements",
        description: Lint.Utils.dedent`
            Bans specific JSX elements from being used.`,
        options: {
            type: "list",
            listType: {
                type: "array",
                items: { type: "string" },
                minLength: 1,
                maxLength: 2,
            },
        },
        optionsDescription: Lint.Utils.dedent`
            A list of \`["regex", "optional explanation here"]\`, which bans
            types that match \`regex\``,
        optionExamples: [[true, ["Object", "Use {} instead."], ["String"]]],
        type: "typescript",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING_FACTORY(elementName: string, messageAddition?: string) {
        return `JSX element '${elementName}' is banned.${messageAddition !== undefined ? ` ${messageAddition}` : ""}`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk, this.ruleArguments.map(parseOption));
    }
}

function parseOption([pattern, message]: [string, string | undefined]): IOption {
    return {message, pattern: new RegExp(`${pattern}`)};
}

function walk(ctx: Lint.WalkContext<IOption[]>) {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) {
            const typeName = node.tagName.getText();
            for (const ban of ctx.options) {
                if (ban.pattern.test(typeName)) {
                    ctx.addFailureAtNode(node.tagName, Rule.FAILURE_STRING_FACTORY(typeName, ban.message));
                    break;
                }
            }
        }
        return ts.forEachChild(node, cb);
    });
}
