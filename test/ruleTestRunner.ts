// Copied from tslint source

import * as colors from "colors";
import * as glob from "glob";
import * as path from "path";

import {runTest, consoleTestResultHandler} from "tslint/lib/test";

// needed to get colors to show up when passing through Grunt
(colors as any).enabled = true;

/* tslint:disable:no-console */
console.log();
console.log(colors.underline("Testing Lint Rules:"));
/* tslint:enable:no-console */

const rulesDirectory = path.resolve(__dirname, "../src/rules");
const testDirectories = glob.sync("test/rules/**/tslint.json").map(path.dirname);

for (const testDirectory of testDirectories) {
    const results = runTest(testDirectory, rulesDirectory);
    const didAllTestsPass = consoleTestResultHandler(results);
    if (!didAllTestsPass) {
        process.exit(1);
    }
}

process.exit(0);
