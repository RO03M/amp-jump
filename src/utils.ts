import { type Position } from "vscode";

const ignoreSymbols = new Set([
	" ", ",", ".", "(", ")", "\"", "'", "´", "\t", "-", "/", ";"
]);

export function getColumnsFromLine(line: string): number[] {
	const positions: number[] = [];

	let prevIsIgnoredSymbol = true;

	for (let i = 0; i < line.length; i++) {
		const currentIsIgnoredSymbol = ignoreSymbols.has(line[i]);
		const nextIsIgnoreSymbol = ignoreSymbols.has(line[i + 1]);

		if (
			!currentIsIgnoredSymbol &&
			(i === 0 || prevIsIgnoredSymbol)
		) {
			if (i + 1 < line.length && !nextIsIgnoreSymbol) {
				positions.push(i);
			}
		}

		prevIsIgnoredSymbol = currentIsIgnoredSymbol;
	}

	return positions;
}

const ERGO_KEYS =
	"fjdksla" +
	"gh" +
	"qweruiop" +
	"zxcvbnm";

export function calcErgoLabel(index: number): string {
	const chars = ERGO_KEYS;
	const base = chars.length;

	let n = index;
	let label = "";

	do {
		label = chars[n % base] + label;
		n = Math.floor(n / base) - 1;
	} while (n >= 0);

	return label;
}

export function calcLabel(key: number): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const base = chars.length;

	let result = "";
	let n = key;

	do {
		result = chars[n % base] + result;
		n = Math.floor(n / base) - 1;
	} while (n >= 0);

	return result;
}

export function chunk<T>(data: T[], chunkSize: number): T[][] {
	const chunked: T[][] = [];

	for (let i = 0; i < data.length; i += chunkSize) {
		chunked.push(data.slice(i, i + chunkSize));
	}

	return chunked;
}

export function squaredDistance(x: Position, y: Position): number {
	const q1 = x.line;
	const p1 = y.line;

	const q2 = x.character;
	const p2 = x.character;

	return Math.pow((q1 - p1), 2) + Math.pow((q2 - p2), 2);
}
