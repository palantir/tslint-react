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

import * as Lint from 'tslint'
import * as ts from 'typescript'
import {
	findChildNodesMatchingCriteria,
	jsxAttributeValueWalker,
} from '../utils'

export class Rule extends Lint.Rules.AbstractRule {
	/* tslint:disable:object-literal-sort-keys */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'jsx-no-lambda-props',
		description: 'Checks for fresh lambda literals used in JSX attributes',
		descriptionDetails: Lint.Utils
			.dedent`Creating new anonymous functions (with either the function syntax or \
            ES2015 arrow syntax) inside the render call stack works against pure component \
            rendering. When doing an equality check between two lambdas, React will always \
            consider them unequal values and force the component to re-render more often than necessary.`,
		options: null,
		optionsDescription: '',
		optionExamples: ['true'],
		type: 'functionality',
		typescriptOnly: false,
	}
	/* tslint:enable:object-literal-sort-keys */

	public static FAILURE_STRING = 'Lambda expressions in JSX create new references on every render and can cause unnecessary rerenders (jsx-no-lambda-props)'

	public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithFunction(
			sourceFile,
			jsxAttributeValueWalker(handleJsxAttribute),
		)
	}
}

function handleJsxAttribute(
	node: ts.Node,
	expression: ts.Node,
	ctx: Lint.WalkContext<void>,
) {
	const attributeNode = node as ts.JsxAttribute
	// Ignore "ref" attribute.
	// ref is not part of the props so using lambdas here will not trigger useless re-renders
	if (attributeNode.name !== undefined && attributeNode.name.text === 'ref') {
		return
	}

	const arrayLiteralNodes = findChildNodesMatchingCriteria(
		expression,
		ctx,
		n => ts.isFunctionExpression(n) || ts.isArrowFunction(n),
	)
	arrayLiteralNodes.forEach(n => ctx.addFailureAtNode(n, Rule.FAILURE_STRING))
}
