import * as Lint from 'tslint'
import * as ts from 'typescript'
import {
	findChildNodesMatchingCriteria,
	jsxAttributeValueWalker,
} from '../utils'

export class Rule extends Lint.Rules.AbstractRule {
	/* tslint:disable:object-literal-sort-keys */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'jsx-no-jsx-literal-props',
		description: 'Checks for jsx literals used in JSX attributes',
		descriptionDetails: Lint.Utils
			.dedent`Creating new JSX expressions inside the render call stack works against pure component \
            rendering. When doing an equality check between two expressions, React will always \
            consider them unequal values and force the component to re-render more often than necessary.`,
		options: null,
		optionsDescription: '',
		optionExamples: ['true'],
		type: 'functionality',
		typescriptOnly: false,
	}
	/* tslint:enable:object-literal-sort-keys */

	/* tslint:disable-next-line max-line-length */
	public static FAILURE_STRING = 'JSX literal properties are forbidden in JSX attributes due to their rendering performance impact'

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
		n => ts.isJsxOpeningLikeElement(n) || ts.isJsxElement(n),
	)
	arrayLiteralNodes.forEach(n => ctx.addFailureAtNode(n, Rule.FAILURE_STRING))
}
