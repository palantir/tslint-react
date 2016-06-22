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
    public static FAILURE_STRING = "PropTypes are forbidden as TypeScript should manage type checking, not React";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new ComponentNoProptypesWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class ComponentNoProptypesWalker extends Lint.RuleWalker {
    protected visitIdentifier(node: ts.Identifier) {
        if (node.text === "propTypes") {
            this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING));
        }
        super.visitIdentifier(node);
    }
}
