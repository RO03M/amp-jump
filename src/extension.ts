import * as vscode from 'vscode';
import { calcLabel, getColumnsFromLine } from './utils.js';

interface Label {
	text: string;
	line: number;
	column: number;
	/**
	 * Reference to the editor that the label was written on
	 */
	editor: vscode.TextEditor;
}

interface Line {
	content: string;
	lineNumber: number;
}

interface AppState {
	active: boolean;
	labelMap: Map<string, Label>,
	labelKey: number
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

function getVisibleText(editor: vscode.TextEditor): Line[] {
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

function buildLabelMap(editor: vscode.TextEditor, state: AppState): Map<string, Label> {
	const labelMap = new Map<string, Label>();

	const lines = getVisibleText(editor);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const positions = getColumnsFromLine(line.content);

		for (const columnPosition of positions) {
			const labelText = calcLabel(state.labelKey);
			// console.log(labelText, state.labelKey, line.content);

			labelMap.set(labelText, {
				text: labelText,
				column: columnPosition,
				line: line.lineNumber,
				editor: editor
			});

			state.labelKey++;
		}
	}

	return labelMap;
}

function render(state: AppState) {
	const editors = vscode.window.visibleTextEditors;

	const maps: Map<string, Label>[] = [];
	state.labelKey = 62;

	for (const editor of editors) {
		const labelMap = buildLabelMap(editor, state);
		maps.push(labelMap);

		const labels = Array.from(labelMap.values());
		renderLabels(editor, labels);
	}

	state.labelMap = new Map(maps.flatMap((map) => [...map]));
	console.log(state.labelMap);
}

function turnOff(state: AppState) {
	const editors = vscode.window.visibleTextEditors;

	for (const editor of editors) {
		editor.setDecorations(hiddenDecoration, []);
		editor.setDecorations(labelDecoration, []);
	}

	vscode.commands.executeCommand("setContext", "amp-jump.on", false);
	state.active = false;
}

async function focusEditorAt(
	editor: vscode.TextEditor,
	line: number,
	column: number
) {
	const position = new vscode.Position(line, column);

	editor.selection = new vscode.Selection(position, position);

	editor.revealRange(
		new vscode.Range(position, position),
		vscode.TextEditorRevealType.InCenter
	);

	await vscode.window.showTextDocument(editor.document, {
		viewColumn: editor.viewColumn,
		preserveFocus: false,
		selection: editor.selection
	});
}

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration("amp-jump");
	const activeBackgroundColor = config.get<string>("dimColor", "rgba(128, 128, 128, 0.5)");
	const state: AppState = {
		active: false,
		labelKey: 62,
		labelMap: new Map()
	};

	const activeDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: activeBackgroundColor
	});

	const disposable = vscode.commands.registerCommand('amp-jump.jumpMode', () => {
		vscode.commands.executeCommand("setContext", "amp-jump.on", true);
		state.active = true;
		render(state);
	});

	const onScroll = vscode.window.onDidChangeTextEditorVisibleRanges(() => {
		if (!state.active) {
			return;
		}

		render(state);
	});

	let input = "";

	function handleInput(char: string) {
		if (input.length == 2) {
			input = "";
		}

		input += char;

		const label = state.labelMap.get(input);

		console.log(label, state, input, label?.editor, vscode.window.visibleTextEditors.includes(label!.editor));
		if (!label) {
			return;
		}

		turnOff(state);
		focusEditorAt(label.editor, label.line, label.column);
	}

	const labels = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

	context.subscriptions.push(
		disposable,
		onScroll,
		vscode.commands.registerCommand("amp-jump.key.escape", turnOff),
		// registering all the keybinds commands
		...labels.map((c) => vscode.commands.registerCommand(`amp-jump.key.${c}`, () => handleInput(c)))
	);
}

export function deactivate() {}
