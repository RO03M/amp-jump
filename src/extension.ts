import * as vscode from 'vscode';
import { getColumnsFromLine } from './utils.js';

interface Label {
	text: string;
	line: number;
	column: number;
}

interface Line {
	content: string;
	lineNumber: number;
}

const hiddenDecoration = vscode.window.createTextEditorDecorationType({
	color: "rgba(0, 0, 0, 0)",
	backgroundColor: "rgb(0, 0, 0)"
});

const labelDecoration = vscode.window.createTextEditorDecorationType({
	before: {
		color: "#FFA500",
		backgroundColor: "rgb(0, 0, 0)"
	}
});

function getVisibleText(): Line[] {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return [];
	}

	const result: Line[] = [];
	const document = editor.document;

	for (const range of editor.visibleRanges) {
		const start = range.start.line;
		const end = range.end.line;

		for (let line = start; line <= end; line++) {
			const lineObj = document.lineAt(line);
			result.push({
				lineNumber: line,
				content: lineObj.text
			});
		}
	}

	return result;
}

function renderLabels(editor: vscode.TextEditor, labels: Label[]) {
	const options: vscode.DecorationOptions[] = [];
	const hiddenRanges: vscode.Range[] = [];
	for (const label of labels) {
		const position = new vscode.Position(label.line, label.column);

		hiddenRanges.push(new vscode.Range(position, position.translate(0, label.text.length)))
		options.push({
			range: new vscode.Range(position, position),
			renderOptions: {
				before: {
					contentText: label.text,
					width: "0"
				}
			}
		});
	}

	editor?.setDecorations(hiddenDecoration, hiddenRanges);
	editor?.setDecorations(labelDecoration, options);
}

function buildLabelMap(editor: vscode.TextEditor): Map<string, Label> {
	const charMap = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	const labelMap = new Map<string, Label>();

	const lines = getVisibleText();

	let charMapX = 0;
	let charMapY = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const positions = getColumnsFromLine(line.content);

		for (const columnPosition of positions) {
			if (charMapX >= charMap.length) {
				break;
			}

			if (charMapY >= charMap.length) {
				charMapY = 0;
				charMapX++;
			}
			
			const labelText = `${charMap.charAt(charMapX)}${charMap.charAt(charMapY)}`;

			labelMap.set(labelText, {
				text: labelText,
				column: columnPosition,
				line: line.lineNumber
			});

			charMapY++;
		}
	}

	return labelMap;
}

export function activate(context: vscode.ExtensionContext) {
	const editor = vscode.window.activeTextEditor; // TODO add support for multiple editors
	const config = vscode.workspace.getConfiguration("amp-jump");
	const activeBackgroundColor = config.get<string>("dimColor", "rgba(128, 128, 128, 0.5)");

	const activeDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: activeBackgroundColor
	});

	const disposable = vscode.commands.registerCommand('amp-jump.jumpMode', () => {
		console.log("editor", !editor);
		if (!editor) {
			return;
		}

		// const visibleText = getVisibleText();
		// const lines = visibleText?.split("\n");
		// const labels: Label[] = [];
		// for (let i = 0; i < lines.length; i++) {
		// 	const line = lines[i];
		// 	const positions = getColumnsFromLine(line);

		// 	for (const columnPosition of positions) {
		// 		// renderLabels(editor, "aa", i, position);
		// 		labels.push({
		// 			text: "aa",
		// 			column: columnPosition,
		// 			line: i
		// 		});
		// 	}
		// }
		const labelMap = buildLabelMap(editor);
		const labels = Array.from(labelMap.values());

		console.log(labels.length);

		renderLabels(editor, labels);

		// renderLabels(editor, [
		// 	{
		// 		text: "aa",
		// 		line: 31,
		// 		column: 0
		// 	},
		// 	{
		// 		text: "bb",
		// 		line: 32,
		// 		column: 1
		// 	},
		// ]);
		// renderLabelAt(editor!, "aa", 0, 1);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
