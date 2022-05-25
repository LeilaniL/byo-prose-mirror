const { DOMSerializer } = require('prosemirror-model');

class NodeView {
  constructor(node) {
    this.dom = null;
    this.contentDOM = null;
    this.parent = null;
    this.children = [];
  }
  
  
}


class EditorView {
  constructor(dom, { state }) {
    this.dom = dom;
    this.state = state;

    this.onBeforeInput = this.onBeforeInput.bind(this);

    this.dom.addEventListener("beforeinput", this.onBeforeInput);
    this.dom.contentEditable = true;
  }

  destroy() {
    this.dom.removeEventListener("beforeinput", this.onBeforeInput);
  }

  dispatch(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  }

  render() {
    const serializer = DOMSerializer.fromSchema(this.state.schema);
    const result = serializer.serializeFragment(this.state.doc.content);
    this.dom.replaceChildren(...result.childNodes);
  }

  updateState(newState) {
    this.state = newState;
    this.render();
  }

  onBeforeInput(event) {
    event.preventDefault();

    switch (event.inputType) {
      case "insertText": {
        const { tr } = this.state;
        tr.insertText(event.data);
        this.dispatch(tr);
      }
    }
  }
}
