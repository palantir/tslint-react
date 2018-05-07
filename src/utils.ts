import * as lint from 'tslint'
import * as ts from 'typescript'

export function descendInto(
	sourceFile: ts.SourceFile,
	node: ts.Node,
	predicate: (node: ts.Node, sourceFile: ts.SourceFile) => boolean,
	whenTrue: (node: ts.Node, sourceFile: ts.SourceFile) => void,
): void {
	if (predicate(node, sourceFile)) {
		whenTrue(node, sourceFile)
	}
	return ts.forEachChild(node, (child: ts.Node) =>
		descendInto(sourceFile, child, predicate, whenTrue),
	)
}

export function getAttributeExpression(node: ts.JsxAttribute) {
	const { initializer } = node
	if (initializer !== undefined && ts.isJsxExpression(initializer)) {
		return initializer.expression
	}
	return undefined
}

export function isPropertyAssignment(
	node: ts.Node,
	sourceFile: ts.SourceFile,
): boolean {
	return (
		ts.isObjectLiteralElement(node) &&
		ts.isPropertyAssignment(node) &&
		// [lval assign rval]
		node.getChildCount(sourceFile) === 3
	)
}

export function jsxWalker(
	handleJsxAttribute: (
		attr: ts.JsxAttribute,
		context: lint.WalkContext<void>,
	) => void,
	handleSpreadAttribute: (
		spread: ts.JsxSpreadAttribute,
		context: lint.WalkContext<void>,
	) => void,
) {
	return function walk(ctx: lint.WalkContext<void>) {
		const { sourceFile } = ctx
		return ts.forEachChild(sourceFile, function cb(node: ts.Node): void {
			if (ts.isJsxAttribute(node)) {
				handleJsxAttribute(node as ts.JsxAttribute, ctx)
			} else if (ts.isJsxSpreadAttribute(node)) {
				handleSpreadAttribute(node as ts.JsxSpreadAttribute, ctx)
			}
			return ts.forEachChild(node, cb)
		})
	}
}

export function jsxAttributeValueWalker(
	handleJsxAttributeValue: (
		attributeNode: ts.Node,
		expression: ts.Node,
		context: lint.WalkContext<void>,
	) => void,
) {
	return jsxWalker(
		(attr, context) => {
			const expression = getAttributeExpression(attr)
			if (expression === undefined) {
				return
			}
			handleJsxAttributeValue(attr as ts.JsxAttribute, expression, context)
		},
		(spread, context) => {
			descendInto(context.sourceFile, spread, isPropertyAssignment, node => {
				// lvalue eq rvalue
				const rValue = node.getChildren(context.sourceFile)[2]
				handleJsxAttributeValue(spread, rValue, context)
			})
		},
	)
}

export function findChildNodesMatchingCriteria(
	node: ts.Node,
	ctx: lint.WalkContext<void>,
	predicate: (node: ts.Node) => boolean,
): ts.Node[] {
	if (predicate(node)) {
		return [node]
	}

	if (ts.isParenthesizedExpression(node)) {
		return findChildNodesMatchingCriteria(node.expression, ctx, predicate)
	}

	if (ts.isConditionalExpression(node)) {
		let literals: ts.Node[] = []
		node.forEachChild((child: ts.Node) => {
			literals = [
				...literals,
				...findChildNodesMatchingCriteria(child, ctx, predicate),
			]
		})
		return literals
	}

	return []
}
