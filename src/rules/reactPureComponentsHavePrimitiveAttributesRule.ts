// tslint:disable no-console
import * as Lint from 'tslint'
import * as ts from 'typescript'

export class Rule extends Lint.Rules.AbstractRule {
	/* tslint:disable:object-literal-sort-keys */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'react-pure-components-have-primitive-attributes',
		description:
			'Checks for React Pure components and SFCs with non-primitive properties.',
		descriptionDetails: Lint.Utils
			.dedent`React components that implement the Pure pattern (Pure Components and Stateless Functional Components) should have 
			primitive properties to pass shallowEqual checks.`,
		options: null,
		optionsDescription: '',
		optionExamples: ['true'],
		type: 'functionality',
		typescriptOnly: false,
	}
	/* tslint:enable:object-literal-sort-keys */

	/* tslint:disable-next-line max-line-length */
	public static FAILURE_STRING = 'Pure React components with non-primitive properties may fail shouldComponentUpdate() checks, leading to excessive renders.'

	public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithFunction(sourceFile, walk)
	}
}

/**
 * Walks a source file, hunting for linting issues
 * @param ctx The linting context
 */
function walk(ctx: Lint.WalkContext<void>) {
	const { sourceFile } = ctx

	return ts.forEachChild(sourceFile, function cb(node: ts.Node): void {
		// TODO: Inspect classes that extend React.PureComponent
		if (isReactSFC(node)) {
			const propTypeNode = getReactSFCProps(node)
			if (propTypeNode === undefined) {
				return
			}
			if (ts.isTypeReferenceNode(propTypeNode)) {
				const typeReference = propTypeNode as ts.TypeReferenceNode
				const typeReferenceDecl = typeReference.getChildAt(0) as ts.Declaration
				// TODO: resolve type information from declaration
				// We need access to the symbols to inspect this type
				console.log('Type Reference Declaration', typeReferenceDecl)
			} else if (ts.isTypeLiteralNode(propTypeNode)) {
				const typeLiteral = propTypeNode as ts.TypeLiteralNode
				inspectComponentPropsInterface(ctx, typeLiteral)
			}
		}
		return ts.forEachChild(node, cb)
	})
}

function isReactSFC(node: ts.Node): boolean {
	if (ts.isVariableDeclaration(node)) {
		const variableDeclaration = node as ts.VariableDeclaration
		const varType = variableDeclaration.type
		if (varType === undefined) {
			return false
		}

		// React.SCF declaration [React.SCF, <, Props, >]
		if (varType.getChildCount() !== 4) {
			return false
		}

		const sfcNode = varType.getChildAt(0)
		const sfcText = sfcNode.getFullText()
		return (
			sfcText.includes('React.SFC') ||
			sfcText.includes('React.StatelessFunctionalComponent')
		)
	}
	return false
}

function getReactSFCProps(
	node: ts.Node,
): ts.TypeLiteralNode | ts.TypeReferenceNode | undefined {
	const variableDeclaration = node as ts.VariableDeclaration
	const varType = variableDeclaration.type as ts.TypeNode
	if (varType === undefined) {
		return
	}

	const declPropTypeNode = varType.getChildAt(2)
	if (declPropTypeNode.getChildCount() === 0) {
		return
	}

	const propTypeNode = declPropTypeNode.getChildAt(0)
	return propTypeNode as any
}

function inspectComponentPropsInterface(
	ctx: Lint.WalkContext<void>,
	type: ts.TypeLiteralNode | ts.InterfaceDeclaration,
) {
	type.members.forEach((member: ts.TypeElement, index: number) => {
		if (!ts.isPropertySignature(member)) {
			return
		}
		const propSig = member as ts.PropertySignature
		const propSigType = propSig.type
		if (propSigType === undefined) {
			return
		}

		if (isComplexType(propSigType)) {
			ctx.addFailureAtNode(propSigType, Rule.FAILURE_STRING)
		}
	})
}

function isComplexType(interfaceMemberType: ts.TypeNode) {
	return (
		ts.isTypeLiteralNode(interfaceMemberType) ||
		// TODO: this will emit false positive on enums, handle types, etc..
		// We need access to the symbols to eliminate false positives
		ts.isTypeReferenceNode(interfaceMemberType)
	)
}
