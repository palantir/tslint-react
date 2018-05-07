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
import { isJsxAttribute, isJsxExpression } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
  /* tslint:disable:object-literal-sort-keys */
  public static metadata: Lint.IRuleMetadata = {
    ruleName: "jsx-no-array-literal-props",
    description: "Checks for array literals used in JSX attributes",
    descriptionDetails: Lint.Utils
      .dedent`Creating new arrays inside the render call stack works against pure component \
            rendering. When doing an equality check between two arrays, React will always \
            consider them unequal values and force the component to re-render more often than necessary.`,
    options: null,
    optionsDescription: "",
    optionExamples: ["true"],
    type: "functionality",
    typescriptOnly: false
  };
  /* tslint:enable:object-literal-sort-keys */

  /* tslint:disable-next-line max-line-length */
  public static FAILURE_STRING = "Array literal properties are forbidden in JSX attributes due to their rendering performance impact";

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<void>) {
  // tslint:disable-next-line
  return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
    // continue iterations until JsxAttribute will be found
    if (isJsxAttribute(node)) {
      const { initializer } = node;
      // early exit in case when initializer is string literal or not provided (e.d. `disabled`)
      if (initializer === undefined || !isJsxExpression(initializer)) {
        return;
      }

      const { expression } = initializer;
      if (expression !== undefined && isArrayLiteral(expression)) {
        return ctx.addFailureAtNode(expression, Rule.FAILURE_STRING);
      }
    }
    return ts.forEachChild(node, cb);
  });
}

function isArrayLiteral(node: ts.Node): boolean {
  switch (node.kind) {
    case ts.SyntaxKind.ArrayLiteralExpression:
      return true;

    case ts.SyntaxKind.ParenthesizedExpression:
      return isArrayLiteral((node as ts.ParenthesizedExpression).expression);

    default:
      return false;
  }
}
