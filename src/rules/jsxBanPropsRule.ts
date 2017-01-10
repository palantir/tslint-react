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
        return `Use of the prop '${propName}' is not allowed.${explanation ? " " + explanation : ""}`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new JsxBanPropsWalker(sourceFile, this.getOptions()));
    }
}

class JsxBanPropsWalker extends Lint.RuleWalker {
    private isInJsxAttribute = false;
    private bannedProps: Map<string, string>;

    constructor(sourceFile: ts.SourceFile, options: Lint.IOptions) {
        super(sourceFile, options);

        const propsToBan = options.ruleArguments;
        this.bannedProps = propsToBan
            ? new Map<string, string>(propsToBan.map((prop: string[]): [string, string] =>
                [prop[0], prop.length > 1 ? prop[1] : ""]))
            : new Map<string, string>();
    }

    protected visitJsxAttribute(node: ts.JsxAttribute) {
        this.isInJsxAttribute = true;
        super.visitJsxAttribute(node);
        this.isInJsxAttribute = false;
    }

    protected visitIdentifier(node: ts.Identifier) {
        if (this.isInJsxAttribute) {
            const propName = (node as ts.Identifier).text;
            if (this.bannedProps.has(propName)) {
                const propBanExplanation = this.bannedProps.get(propName);
                this.addFailureAtNode(node, Rule.FAILURE_STRING_FACTORY(propName, propBanExplanation));
            }
        }
    }
}
