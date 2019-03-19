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
import {
    isArrayLiteralExpression,
    isArrowFunction,
    isBlock,
    isCallExpression,
    isFunctionExpression,
    isIdentifier,
    isJsxAttribute,
    isJsxElement,
    isJsxSelfClosingElement,
    isJsxSpreadAttribute,
    isObjectLiteralExpression,
    isParenthesizedExpression,
    isPropertyAccessExpression,
    isReturnStatement,
} from "tsutils/typeguard/3.0";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-key",
        description: Lint.Utils.dedent
            `Warn if an element that likely requires a key prop — namely, \
            one present in an array literal or an arrow function expression.`,
        options: null,
        optionsDescription: "",
        optionExamples: ["true"],
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = 'Missing "key" prop for element.';

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if ((isJsxElement(node) || isJsxSelfClosingElement(node))
                && node.parent !== undefined
                && isArrayLiteralExpression(node.parent)) {
            checkIteratorElement(node, ctx);
        }

        if (isPropertyAccessExpression(node) && node.name.text === "map") {
            const mapFn = node.parent !== undefined && isCallExpression(node.parent)
                ? node.parent.arguments[0]
                : undefined;

            if (mapFn !== undefined && (isArrowFunction(mapFn) || isFunctionExpression(mapFn))) {
                if (isJsxElement(mapFn.body) || isJsxSelfClosingElement(mapFn.body)) {
                    checkIteratorElement(mapFn.body, ctx);
                } else if (
                    isParenthesizedExpression(mapFn.body) &&
                    (isJsxElement(mapFn.body.expression) || isJsxSelfClosingElement(mapFn.body.expression))
                ) {
                    checkIteratorElement(mapFn.body.expression, ctx);
                } else if (isBlock(mapFn.body)) {
                    const returnStatement = getReturnStatement(mapFn.body.statements);

                    if (returnStatement !== undefined && returnStatement.expression !== undefined) {
                        if (isParenthesizedExpression(returnStatement.expression)) {
                            checkIteratorElement(returnStatement.expression.expression, ctx);
                        } else {
                            checkIteratorElement(returnStatement.expression, ctx);
                        }
                    }
                }
            }
        }

        return ts.forEachChild(node, cb);
    });
}

function checkIteratorElement(node: ts.Node, ctx: Lint.WalkContext<void>) {
    if (isJsxElement(node) && !hasKeyProp(node.openingElement.attributes) &&
        !hasKeyPropSpread(node.openingElement.attributes)) {
        ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
    }

    if (isJsxSelfClosingElement(node) && !hasKeyProp(node.attributes) && !hasKeyPropSpread(node.attributes)) {
        ctx.addFailureAtNode(node, Rule.FAILURE_STRING);
    }
}

function hasKeyProp(attributes: ts.JsxAttributes) {
    return attributes.properties
        .map((prop) => isJsxAttribute(prop) && prop.name.text === "key")
        .indexOf(true) !== -1;
}

function hasKeyPropSpread(attributes: ts.JsxAttributes) {
    return attributes.properties.some((prop) => (
        isJsxSpreadAttribute(prop) &&
        isObjectLiteralExpression(prop.expression) &&
        prop.expression.properties.some((expProp) => (
            expProp.name !== undefined && isIdentifier(expProp.name) && expProp.name.text === "key"
        ))
    ));
}

function getReturnStatement(body: ts.NodeArray<ts.Statement>) {
    return body.filter((item) => isReturnStatement(item))[0] as ts.ReturnStatement | undefined;
}
