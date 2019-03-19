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
import { isJsxAttribute, isJsxElement, isJsxExpression, isJsxText, isTextualLiteral } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

interface IOptions {
    allowPunctuation: boolean;
    allowHtmlEntities: boolean;
}

const htmlEntityRegex = /(&(?:#[0-9]+|[a-zA-Z]+);)/;

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-use-translation-function",
        description: Lint.Utils.dedent`
            Enforces use of a translation function. Most plain string literals are disallowed in JSX when enabled.`,
        options: {
            type: "array",
            items: {
                type: "string",
                enum: ["allow-punctuation", "allow-htmlentities"],
            },
        },
        optionsDescription: Lint.Utils.dedent`
            Whether to allow punctuation and or HTML entities`,
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static TRANSLATABLE_ATTRIBUTES = new Set(["placeholder", "title", "alt"]);
    public static FAILURE_STRING = "String literals are disallowed as JSX. Use a translation function";
    public static FAILURE_STRING_FACTORY = (text: string) =>
        `String literal is not allowed for value of ${text}. Use a translation function`

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk, {
            allowHtmlEntities: this.ruleArguments.indexOf("allow-htmlentities") !== -1,
            allowPunctuation: this.ruleArguments.indexOf("allow-punctuation") !== -1,
        });
    }
}

function walk(ctx: Lint.WalkContext<IOptions>) {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxElement(node)) {

            for (const child of node.children) {
                if (isJsxText(child) && isInvalidText(child.getText(), ctx.options)) {
                    ctx.addFailureAtNode(child, Rule.FAILURE_STRING);
                }

                if (isJsxExpression(child)
                    && child.expression !== undefined
                    && isTextualLiteral(child.expression)) {
                    if (isInvalidText(child.expression.text, ctx.options)) {
                        ctx.addFailureAtNode(child, Rule.FAILURE_STRING);
                    }
                }
            }

        } else if (isJsxAttribute(node)) {
            if (Rule.TRANSLATABLE_ATTRIBUTES.has(node.name.text) && node.initializer !== undefined) {
                if (isTextualLiteral(node.initializer) && isInvalidText(node.initializer.text, ctx.options)) {
                    ctx.addFailureAtNode(node.initializer, Rule.FAILURE_STRING_FACTORY(node.name.text));
                }

                if (isJsxExpression(node.initializer) && isTextualLiteral(node.initializer.expression!)) {
                    if (isInvalidText((node.initializer.expression as ts.LiteralExpression).text, ctx.options)) {
                        ctx.addFailureAtNode(node.initializer, Rule.FAILURE_STRING_FACTORY(node.name.text));
                    }
                }
            }
        }
        return ts.forEachChild(node, cb);
    });
}

function isInvalidText(text: string, options: Readonly<IOptions>) {
    const t = text.trim();

    if (t === "") {
        return false;
    }

    if (options.allowPunctuation && t.indexOf("&") === -1) {
        // fast path: any punctuation that is not potentially an HTML entity
        return /\w/.test(t);
    }

    // split the text into HTML entities and everything else so we can test each part of the string individually
    const parts = t.split(htmlEntityRegex).filter((entity) => entity !== "");

    return parts.some((entity) => {
        if (options.allowHtmlEntities && htmlEntityRegex.test(entity)) {
            return false;
        }

        if (options.allowPunctuation) {
            return /\w/.test(entity);
        }

        return true;
    });
}
