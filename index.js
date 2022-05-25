/* global EditorView */
const { Schema } = require("prosemirror-model");
const { EditorState } = require("prosemirror-state");
const { schema: baseSchema } = require("prosemirror-schema-basic");
const { addListNodes } = require("prosemirror-schema-list");

const schema = new Schema({
  nodes: addListNodes(baseSchema.spec.nodes, "paragraph block*", "block"),
  marks: baseSchema.spec.marks,
});

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    schema,
    doc: schema.node("doc", null, [
      schema.node("bullet_list", null, [
        schema.node("list_item", null, [schema.node("paragraph")]),
      ]),
      schema.node("paragraph", null, [
        schema.node("list_item", null, [schema.node("paragraph")]),
      ]),
    ]),
  }),
});
