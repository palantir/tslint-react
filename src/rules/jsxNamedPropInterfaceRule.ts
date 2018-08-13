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
import { isInterfaceDeclaration } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_MESSAGE = `interface name must be $\{componentName\}Props`;

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<void>) {
  return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
    const isTsx = ctx.sourceFile.languageVariant === 1;
    if (isInterfaceDeclaration(node) && isTsx) {
      const interfaceName = node.name.getText();
      const filePath = ctx.sourceFile.fileName;
      const fileName = filePath.split("/").slice(-1)[0].replace(/.tsx/, "");
      if (interfaceName !== `${fileName}Props`) {
        return ctx.addFailureAtNode(node, Rule.FAILURE_MESSAGE);
      }
    }

    return ts.forEachChild(node, cb);
  });
}
