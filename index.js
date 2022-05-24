/* global EditorView */
const { EditorState } = require("prosemirror-state");
const { schema } = require("prosemirror-schema-basic");

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({ schema }),
});