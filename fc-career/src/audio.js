export function createAudioEngine() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) {
    globalThis.__fcAudioReady = false;
    return null;
  }
  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 0.22;
  master.connect(context.destination);

  const background = context.createGain();
  background.gain.value = 0;
  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = 110;
  const lfo = context.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(oscillator.frequency);
  oscillator.connect(background);
  background.connect(master);
  oscillator.start();
  lfo.start();

  const environment = context.createGain();
  environment.gain.value = 0;
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.6;
  }
  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  noise.connect(filter);
  filter.connect(environment);
  environment.connect(master);
  noise.start();

  function playUi(kind = "click") {
    if (background.gain.value <= 0 && environment.gain.value <= 0) return;
    const buffer = context.createBuffer(1, context.sampleRate * 0.08, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.sin(2 * Math.PI * (kind === "success" ? 660 : 440) * index / context.sampleRate) * (1 - index / channel.length);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = 0.08;
    source.connect(gain);
    gain.connect(master);
    source.start();
  }

  function setPreferences(preferences) {
    if (context.state === "suspended") context.resume().catch(() => {});
    background.gain.setValueAtTime(preferences.background ? 0.16 : 0, context.currentTime);
    environment.gain.setValueAtTime(preferences.environment ? 0.12 : 0, context.currentTime);
    if (preferences.ui) playUi();
  }

  globalThis.__fcAudioReady = true;
  return { context, setPreferences, playUi };
}
