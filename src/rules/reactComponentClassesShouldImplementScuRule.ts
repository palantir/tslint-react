// tslint:disable
import * as Lint from 'tslint'
import * as ts from 'typescript'
import { descendInto } from '../utils'

export class Rule extends Lint.Rules.AbstractRule {
	/* tslint:disable:object-literal-sort-keys */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'react-component-classes-should-implement-scu',
		description:
			'Checks for React components that should implement shouldComponentUpdate()',
		descriptionDetails: Lint.Utils
			.dedent`React component classes render on every prop change by default. To reduce unnecessary renders, these components
			should implement shouldComponentUpdate()`,
		options: null,
		optionsDescription: '',
		optionExamples: ['true'],
		type: 'functionality',
		typescriptOnly: false,
	}
	/* tslint:enable:object-literal-sort-keys */

	/* tslint:disable-next-line max-line-length */
	public static FAILURE_STRING = 'React components extending React.Component should either implement shouldComponentUpdate() or extend PureComponent to avoid unnecessary renders (react-component-classes-should-implement-scu)'

	public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithFunction(sourceFile, walk, undefined)
	}
}

/**
 * Walks a source file, hunting for linting issues
 * @param ctx The linting context
 */
function walk(ctx: Lint.WalkContext<void>) {
	const { sourceFile } = ctx
	return ts.forEachChild(sourceFile, function cb(node: ts.Node): void {
		if (isReactClass(node)) {
			return inspectReactClass(node as ts.ClassDeclaration, ctx)
		}
		return ts.forEachChild(node, cb)
	})
}

function isReactClass(node: ts.Node): boolean {
	return (
		ts.isClassDeclaration(node) &&
		node.getFullText().includes('extends React.Component')
	)
}

function inspectReactClass(
	node: ts.ClassDeclaration,
	ctx: Lint.WalkContext<void>,
) {
	let found = false
	descendInto(
		node,
		node =>
			ts.isMethodDeclaration(node) &&
			(node as ts.MethodDeclaration).name
				.getFullText()
				.includes('shouldComponentUpdate'),
		node => (found = true),
	)
	if (!found) {
		ctx.addFailureAtNode(node, Rule.FAILURE_STRING)
	}
}
