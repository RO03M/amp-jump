export function getColumnsFromLine(line: string): number[] {
	const positions: number[] = [];

	for (let i = 0; i < line.length; i++) {
		if (
			line[i] !== " " &&
			line[i] !== "\t" &&
			(i === 0 || line[i - 1] === " " || line[i - 1] === "\t")
		) {
			if (i + 1 < line.length && line[i + 1] !== " ") {
				positions.push(i);
			}
		}
	}

	return positions;
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