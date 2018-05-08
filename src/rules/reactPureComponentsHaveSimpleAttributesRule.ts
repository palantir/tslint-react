import * as Lint from 'tslint'
import * as ts from 'typescript'
import { descendInto } from '../utils'

// tslint:disable strict-boolean-expressions  no-console
export class Rule extends Lint.Rules.TypedRule {
	/* tslint:disable:object-literal-sort-keys */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'react-pure-components-have-simple-attributes',
		description:
			'Checks for React Pure components and SFCs with simple properties.',
		descriptionDetails: Lint.Utils
			.dedent`React components that implement the Pure pattern (Pure Components and Stateless Functional Components) should have 
			simple, comparable (primitive) properties to pass shallowEqual checks.`,
		options: null,
		optionsDescription: '',
		optionExamples: ['true'],
		requiresTypeInfo: true,
		type: 'functionality',
		typescriptOnly: false,
	}
	/* tslint:enable:object-literal-sort-keys */

	/* tslint:disable-next-line max-line-length */
	public static FAILURE_STRING = 'Pure React components with complex properties, such as objects, may fail shouldComponentUpdate() checks, leading to excessive renders.'

	public applyWithProgram(
		sourceFile: ts.SourceFile,
		program: ts.Program,
	): Lint.RuleFailure[] {
		return this.applyWithFunction(
			sourceFile,
			walk,
			undefined,
			program.getTypeChecker(),
		)
	}
}

/**
 * Walks a source file, hunting for linting issues
 * @param ctx The linting context
 */
function walk(ctx: Lint.WalkContext<void>, typeChecker: ts.TypeChecker) {
	const { sourceFile } = ctx

	return ts.forEachChild(sourceFile, function cb(node: ts.Node): void {
		const propsType: ts.TypeLiteralNode | ts.TypeReferenceNode | undefined =
			extractReactSFCProps(node) || extractPureComponentProps(node)

		if (propsType !== undefined) {
			if (ts.isTypeReferenceNode(propsType)) {
				const typeReference = propsType as ts.TypeReferenceNode
				return inspectComponentPropsTypeReference(
					typeReference,
					ctx,
					typeChecker,
				)
			} else if (ts.isTypeLiteralNode(propsType)) {
				const typeLiteral = propsType as ts.TypeLiteralNode
				return inspectComponentPropsInterface(typeLiteral, ctx, typeChecker)
			}
		}

		return ts.forEachChild(node, cb)
	})
}

function extractReactSFCProps(
	node: ts.Node,
): ts.TypeLiteralNode | ts.TypeReferenceNode | undefined {
	// Extract the SFC type parameter
	if (ts.isVariableDeclaration(node) && hasPureText(node)) {
		let found: ts.TypeLiteralNode | ts.TypeReferenceNode | undefined
		descendInto(
			(node as ts.VariableDeclaration).type,
			n =>
				n.parent !== undefined &&
				n.parent !== node &&
				hasPureText(n.parent) &&
				(ts.isTypeLiteralNode(n) || ts.isTypeReferenceNode(n)),
			n => (found = n as any),
		)
		return found
	}
	return undefined
}

function hasPureText(node: ts.Node): boolean {
	const text = node.getFullText()
	return (
		text.includes('React.SFC') ||
		text.includes('React.StatelessFunctionalComponent')
	)
}

function hasPureComponentText(node: ts.Node): boolean {
	const text = node.getFullText()
	return text.includes('React.PureComponent')
}

function extractPureComponentProps(
	node: ts.Node,
): ts.TypeLiteralNode | ts.TypeReferenceNode | undefined {
	if (
		ts.isClassDeclaration(node) &&
		node.getFullText().includes('extends React.PureComponent')
	) {
		let heritage: ts.HeritageClause | undefined
		descendInto(
			node,
			n => ts.isHeritageClause(n),
			n => (heritage = n as ts.HeritageClause),
		)
		if (heritage !== undefined) {
			let typedExpression: ts.ExpressionWithTypeArguments | undefined
			descendInto(
				heritage,
				n => ts.isExpressionWithTypeArguments(n) && hasPureComponentText(n),
				n => (typedExpression = n as ts.ExpressionWithTypeArguments),
			)
			if (typedExpression) {
				const typeArguments = typedExpression.typeArguments || []
				if (typeArguments.length > 0) {
					return typeArguments[0] as ts.TypeLiteralNode | ts.TypeReferenceNode
				}
			}
		}
	}
	return undefined
}

function inspectComponentPropsInterface(
	type: ts.TypeLiteralNode | ts.InterfaceDeclaration,
	ctx: Lint.WalkContext<void>,
	typeChecker: ts.TypeChecker,
) {
	type.members.forEach((member: ts.TypeElement, index: number) =>
		inspectTypeMember(member, ctx, typeChecker),
	)
}

function inspectComponentPropsTypeReference(
	typeReference: ts.TypeReferenceNode,
	ctx: Lint.WalkContext<void>,
	typeChecker: ts.TypeChecker,
) {
	// Get the target type
	const type = getTypeForTypeReference(typeReference, typeChecker)
	if (type) {
		// Unpack symbolic data
		const typeSymbol = type.getSymbol() as ts.Symbol
		const typeSymbolMembers = typeSymbol.members
		if (typeSymbolMembers) {
			// Inspect target type members
			typeSymbolMembers.forEach((member: ts.Symbol, key: ts.__String) => {
				const memberDeclarations = member.getDeclarations() || []
				memberDeclarations.forEach((declaration: ts.Declaration) =>
					inspectTypeMember(declaration, ctx, typeChecker),
				)
			})
		}
	}
}

function inspectTypeMember(
	member: ts.Node,
	ctx: Lint.WalkContext<void>,
	typeChecker: ts.TypeChecker,
) {
	if (!ts.isPropertySignature(member)) {
		return
	}
	const propSigType = (member as ts.PropertySignature).type
	if (propSigType === undefined) {
		return
	}
	if (isComplexType(propSigType, typeChecker)) {
		ctx.addFailureAtNode(propSigType, Rule.FAILURE_STRING)
	}
}

function getTypeForTypeReference(
	type: ts.TypeReferenceNode,
	typeChecker: ts.TypeChecker,
): ts.Type | undefined {
	if (type.getChildCount() > 0) {
		const typeReferenceDeclaration = type.getChildAt(0) as ts.Declaration
		if (typeReferenceDeclaration) {
			return typeChecker.getTypeAtLocation(typeReferenceDeclaration)
		}
	}
	return undefined
}

function isComplexType(typeNode: ts.TypeNode, typeChecker: ts.TypeChecker) {
	// Reject type literals
	if (ts.isTypeLiteralNode(typeNode)) {
		return true
	}
	// Don't worry about non-type references (e.g. primitives)
	if (!ts.isTypeReferenceNode(typeNode)) {
		return false
	}

	const boundType = typeChecker.getTypeAtLocation(typeNode)
	const boundTypeFlags = boundType.getFlags()

	// Enums are backed by comparable primitives, don't worry about them
	if (hasFlag(boundTypeFlags, ts.TypeFlags.EnumLike)) {
		return false
	}

	const symbol = boundType.getSymbol()
	if (symbol) {
		const symbolFlags = symbol.getFlags()
		if (hasFlag(symbolFlags, ts.SymbolFlags.Interface)) {
			return true
		}
	}

	return false
}

function hasFlag(flags: number, flag: number): boolean {
	// tslint:disable-next-line no-bitwise
	return (flags & flag) === flag
}
