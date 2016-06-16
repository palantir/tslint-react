unless ARGV.length == 1
    puts "Generates the files needed for a new rule"
    puts "Usage: ruby #{__FILE__} rule-name"
    puts "Example: ruby #{__FILE__} jsx-no-string-ref"
    exit 1
end

require 'fileutils'

rule_kebab_name = ARGV.first
rule_pascal_name = rule_kebab_name.split("-").map(&:capitalize).join("")
rule_camel_name = rule_pascal_name[0].downcase + rule_pascal_name[1..-1]
walker_class_name = "#{rule_pascal_name}Walker";

ruleTemplate = <<-END
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
    public static FAILURE_STRING = "** ERROR MESSAGE HERE **";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const walker = new #{walker_class_name}(sourceFile, this.getOptions());
        return this.applyWithWalker(walker);
    }
}

class #{walker_class_name} extends Lint.RuleWalker {
    // ** RULE IMPLEMENTATION HERE **
}
END

testConfigTemplate = <<-END
{
    "rules": {
        "#{rule_kebab_name}": true
    }
}
END

testTemplate = <<-END
** TEST CODE AND MARKUP HERE **
   ~~~~ [example error so this test fails until you change it]
END

project_dir = File.dirname(File.dirname(__FILE__))

rule_path = File.join(project_dir, "./src/rules/#{rule_camel_name}Rule.ts")
File.write(rule_path, ruleTemplate)

test_dir = File.join(project_dir, "test/rules/#{rule_kebab_name}")
FileUtils.mkdir_p test_dir
File.write(File.join(test_dir, "tslint.json"), testConfigTemplate)
File.write(File.join(test_dir, "test.tsx.lint"), testTemplate)
