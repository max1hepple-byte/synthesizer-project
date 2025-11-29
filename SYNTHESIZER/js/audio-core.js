 // --- 1. Audio Setup Globals ---
      window.audioCtx = null;
      window.masterGain = null;
      window.analyser = null;
      window.currentWaveType = 'sine';
      window.activeNotes = {};
      window.animationFrameId = null
      window.currentFrequency = 0;

      window.WAVE_COLOR = '#3cf0f7';

      window.BACKGROUND_COLOR = '#11322f';

      window.NOTE_FREQUENCIES = {
          60: 261.63, 61: 277.18, 62: 293.66, 63: 311.13, 64: 329.63, 65: 349.23,
          66: 369.99, 67: 392.00, 68: 415.30, 69: 440.00, 70: 466.16, 71: 493.88,
          72: 523.25
      };
      
      window.KEY_TO_NOTE = {
          'a': 60, 's': 62, 'd': 64, 'f': 65, 'g': 67, 'h': 69, 'j': 71, 'k': 72,
          'w': 61, 'e': 63, 't': 66, 'y': 68, 'u': 70,
      };
     

    window.setupAudioSystem = function() {
          if (window.audioCtx === null) {
              window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
              window.masterGain = window.audioCtx.createGain();
              window.masterGain.gain.setValueAtTime(parseFloat(document.getElementById('globalVolumeSlider').value), window.audioCtx.currentTime);
            
              window.analyser = window.audioCtx.createAnalyser();
              window.analyser.fftSize = 2048;
              window.analyser.smoothingTimeConstant = parseFloat(window.smoothingSlider.value);
            
              window.masterGain.connect(window.analyser);
              window.analyser.connect(window.audioCtx.destination);
            
              resizeCanvas();
              draw();
          }
      }

    window.playNote = function(midiNote) {
          if (window.activeNotes[midiNote]) return;
          if (!window.audioCtx) window.setupAudioSystem();
          if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
        
          if (window.analyser && window.masterGain && !window.masterGain.numberOfOutputs) {
              window.masterGain.connect(window.analyser);
              window.analyser.connect(window.audioCtx.destination);
          }
        
          const unisonCount = parseInt(document.getElementById('unisonCount').value);
          const detuneAmount = parseInt(document.getElementById('detuneAmount').value);
          const freqShift = parseInt(document.getElementById('masterFreqShift').value);
          const baseFreq = window.NOTE_FREQUENCIES[midiNote] + freqShift;
          const globalVolume = parseFloat(document.getElementById('globalVolumeSlider').value);
        
          window.currentFrequency = baseFreq;




          const oscillators = [];




          for (let i = 0; i < unisonCount; i++) {
              const osc = window.audioCtx.createOscillator();
              const gain = window.audioCtx.createGain();




              const detuneValue = detuneAmount * ((i - (unisonCount - 1) / 2));




              osc.type = window.currentWaveType;
              osc.frequency.setValueAtTime(baseFreq, window.audioCtx.currentTime);
              osc.detune.setValueAtTime(detuneValue, window.audioCtx.currentTime);




              gain.gain.setValueAtTime(globalVolume / unisonCount, window.audioCtx.currentTime);
            
              osc.connect(window.masterGain);
            
              osc.start();
              oscillators.push({ osc, gain });
          }




          window.activeNotes[midiNote] = oscillators;
          window.updateNoteDisplay(midiNote, true);
      }

    window.stopNote = function(midiNote) {
          const oscillators = window.activeNotes[midiNote];
          if (!oscillators) return;




          oscillators.forEach(({ osc, gain }) => {
              gain.gain.cancelScheduledValues(window.audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, window.audioCtx.currentTime + 0.05);




              osc.stop(window.audioCtx.currentTime + 0.05);
              osc.disconnect();
          });




          delete window.activeNotes[midiNote];
          window.updateNoteDisplay(midiNote, false);
        
          if (Object.keys(window.activeNotes).length === 0) {
               window.currentFrequency = 0;
          }
      }