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
const walkerClassName = `${rulePascalName}Walker`;

const ruleTemplate = 
`/**
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
    public static FAILURE_STRING = "** ERROR MESSAGE HERE **";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new ${walkerClassName}(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class ${walkerClassName} extends Lint.RuleWalker {
    // ** RULE IMPLEMENTATION HERE **
}
`;

const testConfigTemplate =
`{
    "rules": {
        "${ruleKebabName}": true
    }
}
`;

const testTemplate =
`** TEST CODE AND MARKUP HERE **
   ~~~~ [example error so this test fails until you change it]
`;

const projectDir = path.dirname(__dirname);

const newRulePath = `./src/rules/${ruleCamelName}Rule.ts`;
fs.access(newRulePath, fs.F_OK, (err) => {
    if (!err) {
        // File already exists.
        process.exit(1);
    }

    const rulePath = path.join(projectDir, newRulePath);
    fs.writeFileSync(rulePath, ruleTemplate);

    const testDir = path.join(projectDir, `test/rules/${ruleKebabName}`);
    fs.mkdirSync(testDir);
    fs.writeFileSync(path.join(testDir, "tslint.json"), testConfigTemplate);
    fs.writeFileSync(path.join(testDir, "test.tsx.lint"), testTemplate);
});
