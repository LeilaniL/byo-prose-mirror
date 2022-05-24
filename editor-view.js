function render(domSpec) {
  const [tagName,  = domSpec
  
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
    this.state = this.state.apply(tr);
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
