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

const fs = require("fs");
const path = require("path");

if (process.argv.length !== 3) {
    const filePath = path.relative(process.cwd(), process.argv[1]);
    console.log("Generates the files needed for a new rule");
    console.log(`Usage: node ${filePath} rule-name`);
    console.log(`Example: node ${filePath} jsx-no-string-ref`);
    process.exit(1);
}

const ruleKebabName = process.argv[2];
const rulePascalName = ruleKebabName.split("-").map((s) => s.charAt(0).toUpperCase() + s.substr(1)).join("");
const ruleCamelName = rulePascalName.charAt(0).toLowerCase() + rulePascalName.substr(1);

const CURRENT_YEAR = (new Date()).getUTCFullYear();
const RULE_TEMPLATE =
`/**
 * @license
 * Copyright ${CURRENT_YEAR} Palantir Technologies, Inc.
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
    public static FAILURE_STRING = "** ERROR MESSAGE HERE **";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        // This creates a WalkContext<T> and passes it in as an argument.
        // An optional 3rd parameter allows you to pass in a parsed version
        // of this.ruleArguments. If used, it is preferred to parse it into
        // a more useful object than this.getOptions().
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    return ts.forEachChild(ctx.sourceFile, cb);

    function cb(node: ts.Node): void {
        // Stop recursing further into the AST by returning early.
        // TODO

        // Add failures on the WalkContext<T>.
        // TODO

        // Continue recursion into the AST.
        return ts.forEachChild(node, cb);
    }
}
`;

const TEST_CONFIG_TEMPLATE =
`{
    "rules": {
        "${ruleKebabName}": true
    }
}
`;

const TEST_TEMPLATE =
`** TEST CODE AND MARKUP HERE **
   ~~~~ [example error so this test fails until you change it]
`;

const projectDir = path.dirname(__dirname);

if (!fs.existsSync("src")) {
    fs.mkdirSync("src");
} else if (!fs.existsSync("src/rules")) {
    fs.mkdirSync("src/rules");
}
const rulePath = path.join(projectDir, `./src/rules/${ruleCamelName}Rule.ts`);
fs.writeFileSync(rulePath, RULE_TEMPLATE, {flag: 'wx'});

if (!fs.existsSync("test")) {
    fs.mkdirSync("test");
} else if (!fs.existsSync("test/rules")) {
    fs.mkdirSync("test/rules");
}
const testDir = path.join(projectDir, `test/rules/${ruleKebabName}`);
fs.mkdirSync(testDir);
fs.writeFileSync(path.join(testDir, "tslint.json"), TEST_CONFIG_TEMPLATE, {flag: 'wx'});
fs.writeFileSync(path.join(testDir, "test.tsx.lint"), TEST_TEMPLATE, {flag: 'wx'});

console.info(`Done! ${ruleKebabName} created.`);
