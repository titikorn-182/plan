import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Guard the actual JSX call sites, not a mocked Next Link implementation.
const files = [
  "features/projects/components/projects-table.tsx",
  "features/projects/components/project-inspector.tsx",
  "features/reports/components/reports-hub.tsx",
  "features/disbursements/components/disbursements-view.tsx",
  "features/disbursements/components/disbursement-import-panel.tsx",
];
describe("on-demand document downloads", () => {
  it.each(files)("%s uses native download anchors, never router prefetch", (file) => {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    let downloads = 0;
    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const attributes = node.attributes.properties;
        const href = attributes.find(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "href",
        );
        if (href?.getText(source).includes("/api/")) {
          downloads++;
          expect(node.tagName.getText(source)).toBe("a");
          expect(
            attributes.some(
              (attribute) =>
                ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "download",
            ),
          ).toBe(true);
        }
        if (href?.getText(source).includes("/reports/print/")) {
          expect(
            attributes.some((attribute) => attribute.getText(source) === "prefetch={false}"),
          ).toBe(true);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(downloads).toBeGreaterThan(0);
  });
});
