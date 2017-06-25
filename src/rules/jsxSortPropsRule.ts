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
import { isJsxOpeningLikeElement } from "tsutils";
import * as ts from "typescript";

const OPTION_IGNORE_CASE = "ignore-case";
const OPTION_SHORTHAND_FIRST = "shorthand-first";

interface IOptions {
    ignoreCase: boolean;
    shorthandFirst: boolean;
}

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-sort-props",
        description: "Requires props in JSX elements to be sorted alphabetically, and grouped as specified",
        optionsDescription: Lint.Utils.dedent`
            Two arguments may be optionally provided:

            * \`"${OPTION_IGNORE_CASE}"\`: Ignore case when comparing keys.
            * \`"${OPTION_SHORTHAND_FIRST}"\`: Enforces shorthand syntax appears first. \
            E.g. boolean attributes w/o a value: \`<Component isError className="error" />\`
        `,
        options: {
            type: "array",
            items: {
                enum: [
                    OPTION_IGNORE_CASE,
                    OPTION_SHORTHAND_FIRST,
                ],
                type: "string",
            },
            additionalItems: false,
            minLength: 0,
            maxLength: 2,
        },
        optionExamples: [
            `true`,
            `[true, "${OPTION_IGNORE_CASE}"]`,
            `[true, "${OPTION_IGNORE_CASE}", "${OPTION_SHORTHAND_FIRST}"]`,
        ],
        type: "maintainability",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static SHORTHAND_FAILURE_FACTORY(name: string) {
        return `Shorthand property '${name}' should come before normal properties`;
    }

    public static ALHPA_FAILURE_FACTORY(name: string) {
        return `The key '${name}' is not sorted alphabetically`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk, parseOptions(this.ruleArguments));
    }
}

function parseOptions(ruleArgs: any[]): IOptions {
    const options: IOptions = {
        ignoreCase: ruleArgs.indexOf(OPTION_IGNORE_CASE) !== -1,
        shorthandFirst: ruleArgs.indexOf(OPTION_SHORTHAND_FIRST) !== -1,
    };
    return options;
}

function walk(ctx: Lint.WalkContext<IOptions>): void {
    const { options, sourceFile } = ctx;
    const { ignoreCase, shorthandFirst } = options;

    function shouldCheckSyntax(currentProperty: ts.JsxAttribute, lastProperty?: ts.JsxAttribute) {
        // Only check syntax if option is set, we have a property to check ,and they changed
        if (!shorthandFirst || lastProperty === undefined) {
            return false;
        }
        return !!currentProperty.initializer !== !!lastProperty.initializer;
    }

    function cb(node: ts.Node): void {
        // Only check object literals with at least one key
        if (!isJsxOpeningLikeElement(node)) {
            return ts.forEachChild(node, cb);
        }

        const properties = node.attributes.properties;
        if (properties.length <= 1) {
            return ts.forEachChild(node, cb);
        }

        let lastKey: string | undefined;
        let lastProperty: ts.JsxAttribute | undefined;

        outer: for (const property of properties) {
            // Only evaluate properties that apply
            switch (property.kind) {
                // Restart ordering after spread assignments
                case ts.SyntaxKind.JsxSpreadAttribute:
                    lastKey = undefined;
                    lastProperty = undefined;
                    break;

                case ts.SyntaxKind.JsxAttribute:
                    const propName = property.name;
                    const propText = propName.text;
                    const key = ignoreCase ? propText.toLowerCase() : propText;

                    if (shouldCheckSyntax(property, lastProperty)) {
                        // Syntax changed and it's shorthand now, so we were not previously
                        if (property.initializer === undefined) {
                            ctx.addFailureAtNode(propName, Rule.SHORTHAND_FAILURE_FACTORY(propText));
                            break outer;
                        }
                        // Reset the alpha keys to re-start alpha sorting by syntax
                        lastKey = key;
                        lastProperty = property;
                        break;
                    }

                    // comparison with undefined is expected
                    if (lastKey! > key) {
                        ctx.addFailureAtNode(propName, Rule.ALHPA_FAILURE_FACTORY(propText));
                        break outer;
                    }
                    lastKey = key;
                    lastProperty = property;
            }
        }

        return ts.forEachChild(node, cb);
    }

    return ts.forEachChild(sourceFile, cb);
}
