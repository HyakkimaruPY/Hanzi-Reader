/* Coordena áudio de exercícios e Música sem acoplar os dois serviços. */
'use strict';

let duckedAudio = null;
let previousVolume = null;

function musicAudio() { return window.MusicPlaybackService?.audio || null; }
function onState(event) {
  const playing = Boolean(event.detail?.active);
  const audio = musicAudio();
  if (playing) {
    if (!audio || audio.paused || duckedAudio === audio) return;
    duckedAudio = audio;
    previousVolume = audio.volume;
    audio.volume = Math.min(audio.volume, 0.16);
    document.documentElement.classList.add('hz-music-ducked');
    return;
  }
  if (duckedAudio) {
    try { duckedAudio.volume = previousVolume ?? duckedAudio.volume; } catch {}
  }
  duckedAudio = null; previousVolume = null;
  document.documentElement.classList.remove('hz-music-ducked');
}

window.addEventListener('hz:practice-audio-state', onState, { passive: true });
addEventListener('pagehide', () => onState({ detail: { active: false } }), { once: true });
