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