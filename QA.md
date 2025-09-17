# Manual QA - Notes formatting

## Cross-paragraph styling
1. Open `index.html` in a browser or launch the Tauri dev app.
2. In the Notes editor, type two short paragraphs separated by a blank line.
3. Drag to select text that starts in the first paragraph and ends in the second.
4. Apply a font size change (e.g., 20px) using the size dropdown.
5. Confirm that only the selected words in each paragraph are wrapped with styled spans and no entire paragraph inherits the size.
6. With the same cross-paragraph selection, apply a highlight color and ensure only the chosen text is highlighted.

## No-selection safeguard
1. Click inside the Notes editor to place the caret but do not select text.
2. Change the font family or color from the toolbar.
3. Verify that nothing happens and the surrounding content keeps its previous formatting, confirming that global styles are not applied.
