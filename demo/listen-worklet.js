/* Open the Chicken Coop — passes what the microphone hears to voice.js from
   the browser's audio thread, in pieces of 2048 samples. Recording here
   rather than on the page means nothing is lost while the page is busy (a
   model setting up can hold it for a second or more); the pieces just wait. */
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.piece = new Float32Array(2048);
    this.filled = 0;
  }

  process(inputs) {
    const x = inputs[0] && inputs[0][0];
    if (x) {
      for (let i = 0; i < x.length; i++) {
        this.piece[this.filled++] = x[i];
        if (this.filled === this.piece.length) {
          this.port.postMessage(this.piece, [this.piece.buffer]);
          this.piece = new Float32Array(2048);
          this.filled = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('chickencoop-capture', Capture);
