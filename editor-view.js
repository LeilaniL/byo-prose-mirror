class EditorView {
  constructor(dom) {
    this.dom = dom;
    this.onBeforeInput = this.onBeforeInput.bind(this);
    this.dom.addEventListener('beforeinput', this.onBeforeInput);
    this.dom.contentEditable = true;
  }
  
  destroy() {
    this.dom.removeEventListener('beforeinput', this.onBeforeInput);
  }
  
  onBeforeInput(event) {
    event.preventDefault();
  }
}