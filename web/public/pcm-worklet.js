// pcm-worklet.js
//
// AudioWorkletProcessor that downsamples the microphone signal from the
// device's native sample rate (usually 48000 Hz on macOS/Chrome) to 16000
// Hz mono and converts Float32 [-1, 1] samples to little-endian Int16
// PCM. The buffered Int16 bytes are posted back to the main thread in
// ~100 ms chunks so the websocket layer can ship them out as soon as
// they arrive.
//
// Decimation is naive (every Nth sample, no anti-alias filter). Speech
// energy lives below 4 kHz, well within the 8 kHz Nyquist of 16 kHz, so
// aliasing is not a problem for ASR. If audio quality matters for some
// other use case, swap in a low-pass + linear interpolation later.

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    // `sampleRate` is a global in AudioWorkletGlobalScope.
    // eslint-disable-next-line no-undef
    this.sourceRate = sampleRate;
    this.ratio = this.sourceRate / this.targetRate;
    this.counter = 0;
    this.buffer = [];
    // 100 ms at 16 kHz = 1600 samples.
    this.flushThreshold = 1600;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) {
      return true;
    }

    for (let i = 0; i < channel.length; i++) {
      this.counter += 1;
      if (this.counter >= this.ratio) {
        this.counter -= this.ratio;
        let s = channel[i];
        if (s > 1) s = 1;
        else if (s < -1) s = -1;
        const int16 = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
        this.buffer.push(int16);
      }
    }

    if (this.buffer.length >= this.flushThreshold) {
      const pcm = new Int16Array(this.buffer);
      this.buffer = [];
      // Transfer the underlying ArrayBuffer so the main thread owns it
      // without copying.
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

// eslint-disable-next-line no-undef
registerProcessor("pcm-processor", PcmProcessor);
