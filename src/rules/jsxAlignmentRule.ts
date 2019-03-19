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
import { isJsxElement, isJsxSelfClosingElement } from "tsutils/typeguard/3.0";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    // tslint:disable object-literal-sort-keys
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-alignment",
        description: "Enforces consistent and readable vertical alignment of JSX tags and attributes",
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: ["true"],
        type: "style",
        typescriptOnly: false,
    };
    // tslint:enable object-literal-sort-keys

    public static ATTR_LINE_FAILURE = "JSX attributes must be on a line below the opening tag";
    public static ATTR_INDENT_FAILURE = "JSX attributes must be indented further than the opening tag statement";
    public static ATTR_ALIGN_FAILURE = "JSX attributes must be on their own line and vertically aligned";
    public static TAG_CLOSE_FAILURE = "Tag closing must be on its own line and aligned with opening of tag";
    public static CLOSING_TAG_FAILURE = "Closing tag must be on its own line and aligned with opening tag";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

const LEADING_WHITESPACE_REGEX = /[ \t]/;

function walk(ctx: Lint.WalkContext<void>) {
    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (isJsxElement(node)) {
            if (isMultiline(node.openingElement)) {
                const startLocation = getLineAndCharacter(node);
                const closeLocation = ctx.sourceFile.getLineAndCharacterOfPosition(
                    node.openingElement.getEnd() - ">".length,
                );
                checkElement(startLocation, node.openingElement.attributes, closeLocation, node.closingElement);
            }
        } else if (isJsxSelfClosingElement(node)) {
            if (isMultiline(node)) {
                const startLocation = getLineAndCharacter(node);
                const closeLocation = ctx.sourceFile.getLineAndCharacterOfPosition(node.getEnd() - "/>".length);
                checkElement(startLocation, node.attributes, closeLocation);
            }
        }
        return ts.forEachChild(node, cb);
    });

    function checkElement(
        elementOpen: ts.LineAndCharacter,
        attributes: Array<ts.JsxAttribute | ts.JsxSpreadAttribute> // TS <=2.2
            | { properties: Array<ts.JsxAttribute | ts.JsxSpreadAttribute> } // TS 2.3
            | ts.JsxAttributes, // TS 2.6
        elementClose: ts.LineAndCharacter,
        closingTag?: ts.JsxClosingElement,
    ) {
        const attrs = Array.isArray(attributes) ? attributes : attributes.properties;
        if (attrs.length === 0) {
            return;
        }

        // in a line like "const element = <Foo",
        // we want the initial indent to be the start of "const" instead of the start of "<Foo"
        const initialIndent = getFirstNonWhitespaceCharacter(elementOpen.line);

        const firstAttr = attrs[0];
        const firstAttrCharacter = getCharacter(firstAttr);

        // ensure that first attribute is not on the same line as the start of the tag
        if (getLine(firstAttr) === elementOpen.line) {
            reportFailure(firstAttr, Rule.ATTR_LINE_FAILURE);
        }

        let lastSeenLine = -1;
        for (const attr of attrs) {
            const character = getCharacter(attr);

            // ensure each attribute is indented further than the start of the tag
            if (character <= initialIndent) {
                reportFailure(attr, Rule.ATTR_INDENT_FAILURE);
            }

            // ensure each attribute is indented equally
            if (attr !== firstAttr && character !== firstAttrCharacter) {
                reportFailure(attr, Rule.ATTR_ALIGN_FAILURE);
            }

            lastSeenLine = getLine(attr);
        }

        // ensure that the closing token of the tag with attributes is on its own line
        // and that it is indented the same as the opening
        if (lastSeenLine === elementClose.line || elementClose.character !== initialIndent) {
            const start = ctx.sourceFile.getPositionOfLineAndCharacter(elementClose.line, elementClose.character);
            ctx.addFailureAt(start, 1, Rule.TAG_CLOSE_FAILURE);
        }

        // ensure closing tag is on its own line and aligned with the opening tag
        if (closingTag !== undefined) {
            const closingTagLocation = getLineAndCharacter(closingTag);
            if (closingTagLocation.line <= elementClose.line || closingTagLocation.character !== initialIndent) {
                reportFailure(closingTag, Rule.CLOSING_TAG_FAILURE);
            }
        }
    }

    function getFirstNonWhitespaceCharacter(line: number): number {
        const lineStart = ctx.sourceFile.getLineStarts()[line];
        const source = ctx.sourceFile.getFullText();

        let width = 0;
        while (lineStart + width < source.length && LEADING_WHITESPACE_REGEX.test(source.charAt(lineStart + width))) {
            width++;
        }
        return width;
    }

    function isMultiline(node: ts.Node) {
        const startLine = getLine(node);
        const endLine = ctx.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
        return startLine !== endLine;
    }

    function getLineAndCharacter(node: ts.Node) {
        return ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart(ctx.sourceFile));
    }

    function getCharacter(node: ts.Node) {
        return getLineAndCharacter(node).character;
    }
    function getLine(node: ts.Node) {
        return getLineAndCharacter(node).line;
    }

    function reportFailure(node: ts.Node, message: string) {
        ctx.addFailureAt(node.getStart(), node.getWidth(), message);
    }
}
