/* global EditorView */
const { EditorState } = require("prosemirror-state");
const { schema } = require("prosemirror-schema-basic");

const doc = schema.node("doc", null, [
  schema.node("paragraph", null, [schema.text("Hello, ProseMirror!")]),
  schema.node("paragraph", null, [schema.text("Time to edit!")]),
]);

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({ doc }),
});
