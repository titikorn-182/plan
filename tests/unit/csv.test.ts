import { describe, expect, it } from "vitest";
import { parseCsvRows } from "@/lib/files/csv";

describe("parseCsvRows", () => {
  it("parses ordinary rows and ignores blank rows", () => {
    expect(parseCsvRows("code,name\r\nP01,โครงการหนึ่ง\r\n\r\nP02,โครงการสอง")).toEqual([
      ["code", "name"],
      ["P01", "โครงการหนึ่ง"],
      ["P02", "โครงการสอง"],
    ]);
  });

  it("supports commas, line breaks, and escaped quotes inside quoted cells", () => {
    expect(parseCsvRows('code,detail\nP01,"บรรทัด 1, ต่อ\nบรรทัด 2 ""สำคัญ"""')).toEqual([
      ["code", "detail"],
      ["P01", 'บรรทัด 1, ต่อ\nบรรทัด 2 "สำคัญ"'],
    ]);
  });

  it("keeps an empty final column", () => {
    expect(parseCsvRows("code,name,note\nP01,โครงการ,")).toEqual([
      ["code", "name", "note"],
      ["P01", "โครงการ", ""],
    ]);
  });
});
