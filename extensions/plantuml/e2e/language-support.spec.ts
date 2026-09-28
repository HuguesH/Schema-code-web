import { expect, test, type Page } from "playwright/test";

async function openExample(page: Page, fileName: string): Promise<void> {
  await page.goto("/");
  await expect(page.locator(".monaco-workbench")).toBeVisible();

  if (new URL(page.url()).port === "8000") {
    for (const directory of ["extensions", "plantuml", "examples"]) {
      await page.getByRole("treeitem", { name: directory, exact: true }).click();
    }
  }
  await page.getByRole("treeitem", { name: fileName }).dblclick();

  await expect(page.locator(".monaco-editor").first()).toBeVisible();
}

async function replaceEditorContent(page: Page, content: string): Promise<void> {
  const editor = page.locator(".monaco-editor").first();
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(content);
}

async function expectTokenHasSyntaxColor(
  page: Page,
  keyword: string,
  identifier: string
): Promise<void> {
  const tokenClasses = await page.locator(".monaco-editor .view-line span").evaluateAll(
    (tokens, [keywordText, identifierText]) => {
      const classForText = (text: string): string | undefined =>
        tokens.find((token) => token.textContent?.trim() === text)?.className;
      return [classForText(keywordText), classForText(identifierText)];
    },
    [keyword, identifier] as const
  );
  expect(tokenClasses[0]).toMatch(/mtk\d+/);
  expect(tokenClasses[1]).toMatch(/mtk\d+/);
  expect(tokenClasses[0]).not.toBe(tokenClasses[1]);
}

test("PlantUML: coloration, complétion et diagnostics dans Monaco", async ({ page }) => {
  await openExample(page, "sequence.puml");
  await replaceEditorContent(page, "@startuml\npart");

  await page.keyboard.press("Control+Space");
  const suggestions = page.locator(".suggest-widget");
  await expect(suggestions).toBeVisible();
  await expect(suggestions).toContainText("participant");

  await page.keyboard.press("Escape");
  await replaceEditorContent(page, "@startuml\nparticipant Alice");
  await expect(page.locator(".squiggly-error")).toBeVisible();
  await expectTokenHasSyntaxColor(page, "participant", "Alice");
});

test("Structurizr DSL: coloration, complétion et diagnostics dans Monaco", async ({ page }) => {
  await openExample(page, "workspace.dsl");
  await replaceEditorContent(page, 'workspace "Architecture" {\n  work');

  await page.keyboard.press("Control+Space");
  const suggestions = page.locator(".suggest-widget");
  await expect(suggestions).toBeVisible();
  await expect(suggestions).toContainText("workspace");

  await page.keyboard.press("Escape");
  await replaceEditorContent(page, 'workspace "Architecture" {\n  model {\n    user = person "Client"\n');
  await expect(page.locator(".squiggly-error")).toBeVisible();
  await expectTokenHasSyntaxColor(page, "workspace", "user");
});
