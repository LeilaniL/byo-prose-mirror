class EditorView {
  constructor(dom, { state }) {
    this.state = state;
    this.dom.contentEditable = true;
  }
}
