import { describe, expect, test } from "vitest";
import { getColumnsFromLine } from "./utils.js";

function printPositions(text: string, positions: number[]) {
    const clonedPositions = [...positions];
    let content = "";
    clonedPositions.sort((a, b) => a - b);
    for (let i = 0; i < text.length; i++) {
        if (clonedPositions.length > 0 && clonedPositions[0] == i) {
            clonedPositions.shift();

            content += `\x1b[31m${text[i]}\x1b[0m`;
            continue;
        }

        content += text[i];
    }

    console.log(content);
}

describe("get char positions from a line", () => {
    test("simple case", () => {
        // test test
        // 012345678
        // v    v
        expect(getColumnsFromLine("test test")).toStrictEqual([0, 5]);
    });

    test("ignore single char words", () => {
        // test a ad
        // 012345678
        // v      v
        expect(getColumnsFromLine("test a ad")).toStrictEqual([0, 7]);
    });

    test("space in the start and end", () => {
        //  test test
        // 0123456789
        //  v    v
        expect(getColumnsFromLine(" test test ")).toStrictEqual([1, 6]);
    });

    test("messy nodejs import line", () => {
        const text = "import    { useRef, useState } from \"react\";";
        const positions = getColumnsFromLine(text);

        expect(positions).toHaveLength(5);
        
        expect(text.charAt(positions[0])).toBe("i");
        expect(text.charAt(positions[1])).toBe("u");
        expect(text.charAt(positions[2])).toBe("u");
        expect(text.charAt(positions[3])).toBe("f");
        expect(text.charAt(positions[4])).toBe("r");
    });

    test("line with tabs", () => {
        const text = "\treturn (";
        const positions = getColumnsFromLine(text);
        expect(positions).toHaveLength(1);
        expect(text.charAt(positions[0])).toBe("r");
    });

    test("empty line", () => {
        const positions = getColumnsFromLine("");

        expect(positions).toHaveLength(0);
    });

    test("just a tabs", () => {
        const positions = getColumnsFromLine("\t\t\t\t");

        expect(positions).toHaveLength(0);
    });

    test("should get words after common simbols, such as \".\", \"()\", etc", () => {
        // should get vscode, commands, execute..., setConte..., amp, jump, on and true
        // so, 8 positions should be returned
        const text = `vscode.commands.executeCommand("setContext", "amp-jump.on", true);`;

        const positions = getColumnsFromLine(text);

        printPositions(text, positions);
        expect(positions).toHaveLength(8);
    });

    test("should not return the position for a single character between two ignore symbols", () => {
        const text = "const x = useMotionValue(0)";
        const positions = getColumnsFromLine(text);

        printPositions(text, positions);
        expect(positions).toHaveLength(2);
    });
});