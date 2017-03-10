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
import * as ts from "typescript";

const OPTION_ALWAYS = "always";
const OPTION_NEVER = "never";
const BOOLEAN_RULE_VALUES = [OPTION_ALWAYS, OPTION_NEVER];
const BOOLEAN_RULE_OBJECT = {
    enum: BOOLEAN_RULE_VALUES,
    type: "string",
};

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "jsx-boolean-value",
        description: "Enforce boolean attribute notation in jsx.",
        optionsDescription: Lint.Utils.dedent`
            One of the following two options must be provided:
            * \`"${OPTION_ALWAYS}"\` requires JSX boolean values to always be set.
            * \`"${OPTION_NEVER}"\` prevents JSX boolean values to be explicity set as \`true\``,
        options: {
            type: "array",
            items: [BOOLEAN_RULE_OBJECT],
            minLength: 1,
            maxLength: 1,
        },
        optionExamples: [
            `[true, "${OPTION_ALWAYS}"]`,
            `[true, "${OPTION_NEVER}"]`,
        ],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static NEVER_MESSAGE = `Value must be omitted for boolean attributes`;
    public static ALWAYS_MESSAGE = `Value must be set for boolean attributes`;

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new JsxBooleanValueWalker(sourceFile, this.getOptions()));
    }
}

class JsxBooleanValueWalker extends Lint.RuleWalker {
    protected visitJsxAttribute(node: ts.JsxAttribute) {
        const { initializer } = node;

        if (initializer === undefined) {
            // if no option set, or explicitly set to "always"
            if (!this.hasOption(OPTION_NEVER)) {
                this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.ALWAYS_MESSAGE));
            }
        } else if (initializer.kind === ts.SyntaxKind.JsxExpression) {
            const isValueTrue = initializer.expression !== undefined
                && initializer.expression.kind === ts.SyntaxKind.TrueKeyword;

            if (isValueTrue && this.hasOption(OPTION_NEVER)) {
                this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.NEVER_MESSAGE));
            }
        }
    }
}
