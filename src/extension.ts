import * as vscode from 'vscode';
import { calcLabel, chunk, getColumnsFromLine } from './utils.js';

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
	labelMap: Map<string, Label>;
	labelKey: number;
	decorations: vscode.TextEditorDecorationType[];
}

function createLabelDecoration(): vscode.TextEditorDecorationType {
	return vscode.window.createTextEditorDecorationType({
		color: "transparent", 
		before: {
			color: "#FFA500",
			backgroundColor: "black",
			width: '2ch',
			margin: '0 -2ch 0 0',
			fontWeight: 'bold; border-radius: 2px;'
		}
	});
}

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

function renderLabels(state: AppState, editor: vscode.TextEditor, labels: Label[]) {
	const options: vscode.DecorationOptions[] = [];
	for (const label of labels) {
		options.push({
			range: new vscode.Range(label.line, label.column, label.line, label.column + 2),
			renderOptions: {
				before: {
					contentText: label.text
				}
			}
		});
	}

	const chunkedOptions = chunk(options, 89);

	for (const chunk of chunkedOptions) {
		const decoration = createLabelDecoration();
		
		editor?.setDecorations(decoration, chunk);
		state.decorations.push(decoration);
	}
}

function buildLabelMap(editor: vscode.TextEditor, state: AppState): Map<string, Label> {
	const labelMap = new Map<string, Label>();

	const lines = getVisibleText(editor);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const positions = getColumnsFromLine(line.content);

		for (const columnPosition of positions) {
			const labelText = calcLabel(state.labelKey);

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
	console.time("render");
	const editors = vscode.window.visibleTextEditors;
	clearDecorations(state);

	const maps: Map<string, Label>[] = [];
	state.labelKey = 62;

	for (const editor of editors) {
		const labelMap = buildLabelMap(editor, state);
		maps.push(labelMap);

		const labels = Array.from(labelMap.values());
		renderLabels(state, editor, labels);
	}

	state.labelMap = new Map(maps.flatMap((map) => [...map]));
	console.timeEnd("render");
	console.log(state.decorations);
}

function clearDecorations(state: AppState) {
	for (const decoration of state.decorations) {
		decoration.dispose();
	}

	state.decorations = [];
}

function turnOff(state: AppState) {
	// const editors = vscode.window.visibleTextEditors;

	// for (const editor of editors) {
	// 	// editor.setDecorations(hiddenDecoration, []);
	// 	// editor.setDecorations(labelDecoration, []);
	// }
	clearDecorations(state);

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

	editor.revealRange(new vscode.Range(position, position));

	if (vscode.window.activeTextEditor !== editor) {
		await vscode.window.showTextDocument(editor.document, editor.viewColumn);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration("amp-jump");
	const activeBackgroundColor = config.get<string>("dimColor", "rgba(128, 128, 128, 0.5)");
	const state: AppState = {
		active: false,
		labelKey: 62,
		labelMap: new Map(),
		decorations: []
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
