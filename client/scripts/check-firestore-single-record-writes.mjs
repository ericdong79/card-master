import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "src");

const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

const allowedFindings = new Map([
	[
		"src/lib/data/repositories/import-export-repository.ts",
		new Set(["await-client-put-in-loop"]),
	],
	[
		"src/lib/data/repositories/local-import-repository.ts",
		new Set(["await-client-put-in-loop"]),
	],
]);

const knownSingleRecordWriteWrappers = new Set([
	"createCard",
	"createReviewEvent",
	"deleteCard",
	"saveCloudProfile",
	"saveCloudProfileAndSetCurrentProfile",
	"touchCloudProfileAndSetCurrentProfile",
	"updateAccountCurrentProfile",
	"updateCard",
]);

// These exact repository compatibility paths still support injected IndexedDB-style
// legacy clients in tests/import flows. New production Firestore paths should use
// repository batch helpers instead of per-record client writes in loops.
function isAllowed(relativePath, findingType) {
	return allowedFindings.get(relativePath)?.has(findingType) ?? false;
}

async function listSourceFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				if (
					entry.name === "dist" ||
					entry.name === "node_modules" ||
					entry.name.startsWith(".")
				) {
					return [];
				}
				return listSourceFiles(fullPath);
			}

			if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
				return [fullPath];
			}

			return [];
		}),
	);
	return files.flat();
}

function lineAndColumn(sourceFile, node) {
	const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
	return {
		line: position.line + 1,
		column: position.character + 1,
	};
}

function callName(callExpression) {
	const expression = callExpression.expression;

	if (ts.isIdentifier(expression)) {
		return expression.text;
	}

	if (ts.isPropertyAccessExpression(expression)) {
		return expression.name.text;
	}

	return null;
}

function isClientWriteCall(callExpression, methodName) {
	const expression = callExpression.expression;
	if (!ts.isPropertyAccessExpression(expression)) return false;
	if (expression.name.text !== methodName) return false;

	const target = expression.expression;
	return (
		(ts.isIdentifier(target) && target.text === "client") ||
		(ts.isPropertyAccessExpression(target) && target.name.text === "client")
	);
}

function isDeleteDocCall(callExpression) {
	return callName(callExpression) === "deleteDoc";
}

function isPromiseAllCall(callExpression) {
	const expression = callExpression.expression;
	return (
		ts.isPropertyAccessExpression(expression) &&
		expression.name.text === "all" &&
		ts.isIdentifier(expression.expression) &&
		expression.expression.text === "Promise"
	);
}

function hasCreateCardCall(node) {
	return hasCallNamed(node, new Set(["createCard"]));
}

function hasCallNamed(node, names) {
	let found = false;

	function visit(child) {
		if (found) return;

		if (ts.isCallExpression(child)) {
			const name = callName(child);
			if (name && names.has(name)) {
				found = true;
				return;
			}
		}

		ts.forEachChild(child, visit);
	}

	ts.forEachChild(node, visit);
	return found;
}

function hasSingleRecordWriteWrapperReference(node) {
	let found = false;

	function visit(child) {
		if (found) return;

		if (
			ts.isIdentifier(child) &&
			knownSingleRecordWriteWrappers.has(child.text)
		) {
			found = true;
			return;
		}

		ts.forEachChild(child, visit);
	}

	ts.forEachChild(node, visit);
	return found;
}

function collectAwaitCalls(node, predicate) {
	const matches = [];

	function visit(child) {
		if (
			ts.isAwaitExpression(child) &&
			ts.isCallExpression(child.expression) &&
			predicate(child.expression)
		) {
			matches.push(child);
		}

		ts.forEachChild(child, visit);
	}

	ts.forEachChild(node, visit);
	return matches;
}

function isLoopStatement(node) {
	return (
		ts.isForStatement(node) ||
		ts.isForInStatement(node) ||
		ts.isForOfStatement(node) ||
		ts.isWhileStatement(node) ||
		ts.isDoStatement(node)
	);
}

function scanSourceFile(sourceFile, relativePath) {
	const findings = [];

	function addFinding(type, node, message) {
		if (isAllowed(relativePath, type)) return;

		findings.push({
			type,
			relativePath,
			...lineAndColumn(sourceFile, node),
			message,
		});
	}

	function visit(node) {
		if (isLoopStatement(node)) {
			for (const match of collectAwaitCalls(node.statement, (callExpression) =>
				isClientWriteCall(callExpression, "put"),
			)) {
				addFinding(
					"await-client-put-in-loop",
					match,
					"Do not await client.put inside loops; use repository batch writes.",
				);
			}

			for (const match of collectAwaitCalls(node.statement, (callExpression) =>
				isClientWriteCall(callExpression, "delete"),
			)) {
				addFinding(
					"await-client-delete-in-loop",
					match,
					"Do not await client.delete inside loops; use repository batch deletes.",
				);
			}

			for (const match of collectAwaitCalls(node.statement, isDeleteDocCall)) {
				addFinding(
					"await-delete-doc-in-loop",
					match,
					"Do not await deleteDoc inside loops; use commitBatchedWrites.",
				);
			}

			for (const match of collectAwaitCalls(node.statement, (callExpression) => {
				const name = callName(callExpression);
				return Boolean(name && knownSingleRecordWriteWrappers.has(name));
			})) {
				addFinding(
					"await-single-record-wrapper-in-loop",
					match,
					"Do not await known single-record write wrappers inside loops; use repository batch writes.",
				);
			}
		}

		if (ts.isCallExpression(node) && isPromiseAllCall(node)) {
			if (node.arguments.some(hasCreateCardCall)) {
				addFinding(
					"promise-all-create-card",
					node,
					"Do not create cards through Promise.all; use the card repository bulk path.",
				);
			}
			if (
				node.arguments.some((argument) =>
					hasCallNamed(argument, knownSingleRecordWriteWrappers),
				)
			) {
				addFinding(
					"promise-all-single-record-wrapper",
					node,
					"Do not call known single-record write wrappers through Promise.all; use repository batch writes.",
				);
			}
			if (node.arguments.some(hasSingleRecordWriteWrapperReference)) {
				addFinding(
					"promise-all-single-record-wrapper-reference",
					node,
					"Do not pass known single-record write wrappers through Promise.all; use repository batch writes.",
				);
			}
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return findings;
}

async function main() {
	const sourceFiles = await listSourceFiles(srcRoot);
	const findings = [];

	for (const filePath of sourceFiles) {
		const sourceText = await readFile(filePath, "utf8");
		const relativePath = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
		const sourceKind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
			? ts.ScriptKind.TSX
			: ts.ScriptKind.TS;
		const sourceFile = ts.createSourceFile(
			relativePath,
			sourceText,
			ts.ScriptTarget.Latest,
			true,
			sourceKind,
		);
		findings.push(...scanSourceFile(sourceFile, relativePath));
	}

	if (findings.length > 0) {
		console.error("Firestore single-record write regression scan failed:");
		for (const finding of findings) {
			console.error(
				`- ${finding.relativePath}:${finding.line}:${finding.column} ${finding.message}`,
			);
		}
		process.exitCode = 1;
		return;
	}

	console.log("Firestore single-record write regression scan passed.");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
