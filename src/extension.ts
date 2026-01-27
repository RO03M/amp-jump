import * as vscode from 'vscode';
import { calcErgoLabel, calcLabel, chunk, squaredDistance, getColumnsFromLine, labelAlphabet } from './utils.js';

interface Label {
	text: string;
	line: number;
	column: number;
	distance: number;
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
	alphabet: string;
}

function createLabelDecoration(): vscode.TextEditorDecorationType {
	const config = vscode.workspace.getConfiguration("amp-jump");
	const labelColor = config.get<string>("labelColor", "#FFA500");
	const labelBg = config.get<string>("labelBackgroundColor", "transparent");

	return vscode.window.createTextEditorDecorationType({
		color: "transparent", 
		before: {
			color: labelColor,
			backgroundColor: labelBg,
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
	const cursorPosition = editor.selection.active;

	const labels: Label[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const columns = getColumnsFromLine(line.content);

		for (const columnPosition of columns) {
			const position = new vscode.Position(line.lineNumber, columnPosition);
			const distance = squaredDistance(cursorPosition, position);

			const label: Label = {
				text: "",
				column: columnPosition,
				line: line.lineNumber,
				editor: editor,
				distance: distance
			};

			labels.push(label);
		}
	}

	// the distance method seems off, should make a util for that
	labels.sort((a, b) => a.distance - b.distance);
	labels.splice(state.alphabet.length * state.alphabet.length);
	
	for (let i = 0; i < labels.length; i++) {
		const labelText = calcLabel(state.labelKey, state.alphabet);
		labels[i].text = labelText;

		labelMap.set(labelText, labels[i]);
		state.labelKey++;
	}

	return labelMap;
}

function render(state: AppState) {
	const editors = vscode.window.visibleTextEditors;
	clearDecorations(state);

	const maps: Map<string, Label>[] = [];
	state.labelKey = state.alphabet.length;

	for (const editor of editors) {
		const labelMap = buildLabelMap(editor, state);
		maps.push(labelMap);

		const labels = Array.from(labelMap.values());
		renderLabels(state, editor, labels);
	}

	state.labelMap = new Map(maps.flatMap((map) => [...map]));
}

function clearDecorations(state: AppState) {
	for (const decoration of state.decorations) {
		decoration.dispose();
	}

	state.decorations = [];
}

function turnOff(state: AppState) {
	clearDecorations(state);

	vscode.commands.executeCommand("setContext", "amp-jump.on", false);
	vscode.window.setStatusBarMessage("");
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
	const state: AppState = {
		active: false,
		labelKey: 0,
		labelMap: new Map(),
		decorations: [],
		alphabet: labelAlphabet()
	};

	const disposable = vscode.commands.registerCommand('amp-jump.jumpMode', () => {
		if (state.active) {
			turnOff(state);
			return;
		}

		vscode.commands.executeCommand("setContext", "amp-jump.on", true);
		state.alphabet = labelAlphabet(); // calling this here so when the user changed the config it reassign on command activation
		state.active = true;
		render(state);
		vscode.commands.executeCommand("closeFindWidget");
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
		vscode.window.setStatusBarMessage(`jump: ${input}`);

		const label = state.labelMap.get(input);

		if (!label) {
			return;
		}

		turnOff(state);
		focusEditorAt(label.editor, label.line, label.column);
	}

	const keys = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

	context.subscriptions.push(
		disposable,
		onScroll,
		vscode.commands.registerCommand("amp-jump.key.escape", () => turnOff(state)),
		// registering all the keybinds commands
		...keys.map((c) => vscode.commands.registerCommand(`amp-jump.key.${c}`, () => handleInput(c)))
	);
}

export function deactivate() {}
