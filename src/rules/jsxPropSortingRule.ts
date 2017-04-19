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

import * as ts from "typescript";
import * as Lint from "tslint/lib/lint";

export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = "Prop names are not alphabetized";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new JsxPropSortingWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class JsxPropSortingWalker extends Lint.RuleWalker {
    protected visitInterfaceDeclaration(node: ts.InterfaceDeclaration) {
        let prevChildName = "";
        let currChildName = "";
        ts.forEachChild(node, child => {
            if (child.kind === ts.SyntaxKind.PropertySignature) {
                currChildName = child.getText();
                if (currChildName.localeCompare(prevChildName) > 0) {
                    prevChildName = currChildName;
                } else {
                    this.addFailure(this.createFailure(child.getStart(), child.getWidth(), Rule.FAILURE_STRING));
                }
            }
        });

        super.visitInterfaceDeclaration(node);
    }
}
