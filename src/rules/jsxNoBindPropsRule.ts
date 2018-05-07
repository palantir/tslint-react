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

import * as Lint from 'tslint'
import * as ts from 'typescript'
import {
	findChildNodesMatchingCriteria,
	jsxAttributeValueWalker,
} from '../utils'

export class Rule extends Lint.Rules.AbstractRule {
	/* tslint:disable:object-literal-sort-keys */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'jsx-no-bind-props',
		description: Lint.Utils
			.dedent`Forbids function binding in JSX attributes. This has the same intent \
            as jsx-no-lambda in helping you avoid excessive re-renders.`,
		descriptionDetails: Lint.Utils
			.dedent`Note that this currently only does a simple syntactic check, \
            not a semantic one (it doesn't use the type checker). So it may \
            have some rare false positives if you define your own .bind function \
            and supply this as a parameter.`,
		options: null,
		optionsDescription: '',
		optionExamples: ['true'],
		type: 'functionality',
		typescriptOnly: false,
	}
	/* tslint:enable:object-literal-sort-keys */

	public static FAILURE_STRING = 'Binds are forbidden in JSX attributes due to their rendering performance impact'

	public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithFunction(
			sourceFile,
			jsxAttributeValueWalker(handleJsxAttribute),
		)
	}
}

function handleJsxAttribute(
	attr: ts.Node,
	expression: ts.Node,
	ctx: Lint.WalkContext<void>,
) {
	const arrayLiteralNodes = findChildNodesMatchingCriteria(
		expression,
		ctx,
		n => ts.isCallExpression(n) && n.getText(ctx.sourceFile).includes('.bind('),
	)
	arrayLiteralNodes.forEach(n => ctx.addFailureAtNode(n, Rule.FAILURE_STRING))
}
