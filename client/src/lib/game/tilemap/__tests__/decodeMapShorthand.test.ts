import { decodeMapShorthand } from "../loadTilemap";

describe("decodeMapShorthand", () => {
    it("returns an empty array for an empty input", () => {
        expect(decodeMapShorthand([])).toEqual([]);
    });

    it("maps W/F/G to water/flatgrass/grass", () => {
        expect(decodeMapShorthand([["W", "F", "G"]])).toEqual([
            ["water", "flatgrass", "grass"],
        ]);
    });

    it("converts unknown shorthand to null", () => {
        expect(decodeMapShorthand([["X", "?", "", "W"]])).toEqual([
            [null, null, null, "water"],
        ]);
    });

    it("preserves grid dimensions", () => {
        const input = [
            ["W", "W"],
            ["G", "F"],
            ["W", "G"],
        ];
        const out = decodeMapShorthand(input);
        expect(out.length).toBe(3);
        expect(out.every((row) => row.length === 2)).toBe(true);
    });
});
