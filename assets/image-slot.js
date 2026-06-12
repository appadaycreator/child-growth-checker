/* image-slot custom element — production stub */
(() => {
  if (customElements.get('image-slot')) return;

  class ImageSlot extends HTMLElement {
    connectedCallback() {
      if (!this.shadowRoot) {
        const root = this.attachShadow({ mode: 'open' });
        const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
        let radius = '12px';
        if (shape === 'circle') radius = '50%';
        else if (shape === 'pill') radius = '9999px';
        else {
          const n = parseFloat(this.getAttribute('radius'));
          radius = (Number.isFinite(n) ? n : 12) + 'px';
        }
        root.innerHTML = `
          <style>
            :host { display: inline-block; width: 240px; height: 160px; }
            .wrap {
              width: 100%; height: 100%; border-radius: ${radius};
              background: rgba(31,168,155,0.08);
              border: 2px dashed rgba(31,168,155,0.3);
              display: flex; align-items: center; justify-content: center;
              color: rgba(31,168,155,0.6);
              font: 700 13px/1.4 'M PLUS Rounded 1c', sans-serif;
              text-align: center; padding: 12px; box-sizing: border-box;
            }
          </style>
          <div class="wrap">${this.getAttribute('placeholder') || ''}</div>
        `;
      }
    }
  }
  customElements.define('image-slot', ImageSlot);
})();
