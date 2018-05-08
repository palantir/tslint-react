import * as lint from 'tslint'
import * as ts from 'typescript'

export function descendInto(
	node: ts.Node | undefined,
	predicate: (node: ts.Node) => boolean,
	whenTrue: (node: ts.Node) => void,
): void {
	if (node !== undefined) {
		if (predicate(node)) {
			return whenTrue(node)
		}
		return ts.forEachChild(node, (child: ts.Node) =>
			descendInto(child, predicate, whenTrue),
		)
	}
}

export function getAttributeExpression(node: ts.JsxAttribute) {
	const { initializer } = node
	if (initializer !== undefined && ts.isJsxExpression(initializer)) {
		return initializer.expression
	}
	return undefined
}

export function isPropertyAssignment(node: ts.Node): boolean {
	return (
		ts.isObjectLiteralElement(node) &&
		ts.isPropertyAssignment(node) &&
		// [lval assign rval]
		node.getChildCount() === 3
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
			descendInto(spread, isPropertyAssignment, node => {
				// lvalue eq rvalue
				const rValue = node.getChildren()[2]
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
