window.smoothingSlider = document.getElementById('smoothingSlider');
window.updateSlider = document.getElementById('updateSlider');

      // --- 5. UI and Event Handlers (Unchanged) ---
    
      document.getElementById('startAudioBtn').addEventListener('click', () => {
          window.setupAudioSystem();
          document.getElementById('startAudioBtn').textContent = "✅ Keyboard Ready";
          document.getElementById('startAudioBtn').disabled = true;
      });




      smoothingSlider.addEventListener('input', (e) => {
          const newSmoothing = parseFloat(e.target.value).toFixed(2);
          document.getElementById('smoothingValue').textContent = newSmoothing;
          if (window.analyser) {
              window.analyser.smoothingTimeConstant = parseFloat(newSmoothing);
          }
      });
      updateSlider.addEventListener('input', (e) => {
          document.getElementById('updateValue').textContent = e.target.value;
      });
    
      const noteDisplay = document.getElementById('noteDisplay');
    
      window.updateNoteDisplay = function(midiNote, isPlaying) {
           const noteName = getNoteName(midiNote);
           if (isPlaying) {
               noteDisplay.textContent = `Playing: ${noteName}`;
               noteDisplay.style.display = 'block';
           } else if (Object.keys(window.activeNotes).length === 0) {
               noteDisplay.style.display = 'none';
           }
       }
     
       function getNoteName(midi) {
            const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            const octave = Math.floor(midi / 12) - 1;
            const name = noteNames[midi % 12];
            return name + octave;
       }
     
       document.querySelectorAll('.wave-btn').forEach(button => {
           button.addEventListener('click', () => {
               document.querySelectorAll('.wave-btn').forEach(btn => btn.classList.remove('wave-active'));
               button.classList.add('wave-active');
               window.currentWaveType = button.id;
           });
       });




       document.getElementById('masterFreqShift').addEventListener('input', (e) => {
           document.getElementById('freqShiftValue').textContent = e.target.value;
       });
       document.getElementById('unisonCount').addEventListener('input', (e) => {
           document.getElementById('unisonValue').textContent = e.target.value;
       });
       document.getElementById('detuneAmount').addEventListener('input', (e) => {
           document.getElementById('detuneValue').textContent = e.target.value;
       });
       document.getElementById('globalVolumeSlider').addEventListener('input', (e) => {
    const newVolume = parseFloat(e.target.value).toFixed(2);
    document.getElementById('globalVolumeValue').textContent = newVolume;
    if (window.masterGain && window.audioCtx) {
        window.masterGain.gain.setValueAtTime(parseFloat(newVolume), window.audioCtx.currentTime);
    }
});




       const pressedKeys = {};




       document.addEventListener('keydown', (event) => {
           if (!window.audioCtx || window.audioCtx.state === 'suspended') return;
           const key = event.key.toLowerCase();
           const midiNote = window.KEY_TO_NOTE[key];
           if (midiNote && !pressedKeys[key]) {
               event.preventDefault();
               pressedKeys[key] = true;
               window.playNote(midiNote);
           }
       });




       document.addEventListener('keyup', (event) => {
           const key = event.key.toLowerCase();
           const midiNote = window.KEY_TO_NOTE[key];
           if (midiNote && pressedKeys[key]) {
               delete pressedKeys[key];
               window.stopNote(midiNote);
           }
       });