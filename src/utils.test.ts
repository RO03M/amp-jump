import { describe, expect, test } from "vitest";
import { getColumnsFromLine } from "./utils.js";

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
        expect(text.charAt(positions[4])).toBe("\"");
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
});