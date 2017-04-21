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
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    public static ATTR_LINE_FAILURE = "JSX attributes must be on a line below the opening tag";
    public static ATTR_INDENT_FAILURE = "JSX attributes must be indented further than the opening tag statement";
    public static ATTR_ALIGN_FAILURE = "JSX attributes must be on their own line and vertically aligned";
    public static TAG_CLOSE_FAILURE = "Tag closing must be on its own line and aligned with opening of tag";
    public static CLOSING_TAG_FAILURE = "Closing tag must be on its own line and aligned with opening tag";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxAlignmentWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

const leadingWhitespaceRegex = /[ \t]/;

class JsxAlignmentWalker extends Lint.RuleWalker {
    protected visitJsxElement(node: ts.JsxElement) {
        if (this.isMultiline(node.openingElement)) {
            const startLocation = this.getLineAndCharacter(node);
            const closeLocation = this.getSourceFile().getLineAndCharacterOfPosition(
                node.openingElement.getEnd() - ">".length,
            );
            this.checkElement(startLocation, node.openingElement.attributes, closeLocation, node.closingElement);
        }
        super.visitJsxElement(node);
    }

    protected visitJsxSelfClosingElement(node: ts.JsxSelfClosingElement) {
        if (this.isMultiline(node)) {
            const startLocation = this.getLineAndCharacter(node);
            const closeLocation = this.getSourceFile().getLineAndCharacterOfPosition(node.getEnd() - "/>".length);
            this.checkElement(startLocation, node.attributes, closeLocation);
        }
        super.visitJsxSelfClosingElement(node);
    }

    private checkElement(
        elementOpen: ts.LineAndCharacter,
        attributes: Array<ts.JsxAttribute | ts.JsxSpreadAttribute> // TS <=2.2
            | { properties: Array<ts.JsxAttribute | ts.JsxSpreadAttribute> }, // TS 2.3
        elementClose: ts.LineAndCharacter,
        closingTag?: ts.JsxClosingElement,
    ) {
        attributes = attributes == null || Array.isArray(attributes) ? attributes : attributes.properties;
        if (attributes == null || attributes.length === 0) { return; }

        // in a line like "const element = <Foo",
        // we want the initial indent to be the start of "const" instead of the start of "<Foo"
        const initialIndent = this.getFirstNonWhitespaceCharacter(elementOpen.line);

        const firstAttr = attributes[0];
        const firstAttrCharacter = this.getCharacter(firstAttr);

        // ensure that first attribute is not on the same line as the start of the tag
        if (this.getLine(firstAttr) === elementOpen.line) {
            this.reportFailure(firstAttr, Rule.ATTR_LINE_FAILURE);
        }

        let lastSeenLine = -1;
        for (const attr of attributes) {
            const character = this.getCharacter(attr);

            // ensure each attribute is indented further than the start of the tag
            if (character <= initialIndent) {
                this.reportFailure(attr, Rule.ATTR_INDENT_FAILURE);
            }

            // ensure each attribute is indented equally
            if (attr !== firstAttr && character !== firstAttrCharacter) {
                this.reportFailure(attr, Rule.ATTR_ALIGN_FAILURE);
            }

            lastSeenLine = this.getLine(attr);
        }

        // ensure that the closing token of the tag with attributes is on its own line
        // and that it is indented the same as the opening
        if (lastSeenLine === elementClose.line || elementClose.character !== initialIndent) {
            this.addFailure(this.createFailure(
                this.getSourceFile().getPositionOfLineAndCharacter(elementClose.line, elementClose.character),
                1,
                Rule.TAG_CLOSE_FAILURE,
            ));
        }

        // ensure closing tag is on its own line and aligned with the opening tag
        if (closingTag != null) {
            const closingTagLocation = this.getLineAndCharacter(closingTag);
            if (closingTagLocation.line <= elementClose.line || closingTagLocation.character !== initialIndent) {
                this.reportFailure(closingTag, Rule.CLOSING_TAG_FAILURE);
            }
        }
    }

    private getFirstNonWhitespaceCharacter(line: number): number {
        const lineStart = this.getSourceFile().getLineStarts()[line];
        const source = this.getSourceFile().getFullText();

        let width = 0;
        while (lineStart + width < source.length && leadingWhitespaceRegex.test(source.charAt(lineStart + width))) {
            width++;
        }
        return width;
    }

    private isMultiline(node: ts.Node) {
        const startLine = this.getLine(node);
        const endLine = this.getSourceFile().getLineAndCharacterOfPosition(node.getEnd()).line;
        return startLine !== endLine;
    }

    private getLineAndCharacter(node: ts.Node) {
        const sourceFile = this.getSourceFile();
        return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    }

    private getCharacter = (node: ts.Node) => this.getLineAndCharacter(node).character;
    private getLine = (node: ts.Node) => this.getLineAndCharacter(node).line;

    private reportFailure(node: ts.Node, message: string) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
    }
}
