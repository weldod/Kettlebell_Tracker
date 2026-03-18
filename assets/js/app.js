document.addEventListener('DOMContentLoaded', () => {

    // Audio Context & Sync Beeps
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let isMuted = false;
    
    // Un simple synthétiseur de bip pour ne pas avoir besoin de fichiers audio externes dans un premier temps
    function playBeep(type) {
        if (isMuted) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        
        if (type === 'short') {
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'long') {
            oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
        }
    }

    // UI Elements
    const elMain = document.getElementById('app-main');
    const elStatus = document.getElementById('timer-status');
    const elDisplay = document.getElementById('timer-display');
    const elSets = document.getElementById('timer-sets');
    const elTimerScreen = document.getElementById('timer-screen');
    
    // Config Elements
    const confSection = document.getElementById('config-section');
    const valWork = document.getElementById('val-work');
    const valRest = document.getElementById('val-rest');
    const valSets = document.getElementById('val-sets');
    const valWeight = document.getElementById('val-weight');
    const displayTotalTime = document.getElementById('display-total-time');
    const checkSkipLastRest = document.getElementById('check-skip-last-rest');
    
    // Exercise Elements
    const listExercises = document.getElementById('exercises-list');
    const inputExercise = document.getElementById('input-exercise');
    const btnAddExercise = document.getElementById('btn-add-exercise');
    const presetsContainer = document.getElementById('presets-container');
    const btnSaveList = document.getElementById('btn-save-list');

    // Button Elements
    const btnStart = document.getElementById('btn-start');
    const btnReset = document.getElementById('btn-reset');
    const btnMute = document.getElementById('btn-mute');
    const iconSoundOn = document.getElementById('icon-sound-on');
    const iconSoundOff = document.getElementById('icon-sound-off');
    
    // History Elements
    const btnHistory = document.getElementById('btn-history');
    const screenHistory = document.getElementById('screen-history');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyContainer = document.getElementById('history-container');

    // Values State
    let cfgWork = 40;
    let cfgRest = 20;
    let cfgSets = 5;
    let cfgWeight = 16;
    let cfgExercises = [];
    let cfgSkipLastRest = true;
    
    // Load saved lists
    let savedLists = JSON.parse(localStorage.getItem('kettlebellSavedLists')) || {
        "List A": ["Squats", "Clean & Press"],
        "List B": ["Thrusters", "Swings"]
    };

    // init timer
    const timer = new KettlebellTimer(cfgWork, cfgRest, cfgSets, cfgExercises, cfgSkipLastRest);

    function renderExercises() {
        listExercises.innerHTML = '';
        cfgExercises.forEach((ex, idx) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-gray-800 px-3 py-2 rounded-lg';
            li.innerHTML = `
                <span class="font-bold text-fluo">${ex}</span>
                <button class="text-red-500 font-bold px-2 py-1 active:scale-95 btn-remove-ex" data-idx="${idx}">x</button>
            `;
            listExercises.appendChild(li);
        });

        // Add event listeners for remove buttons
        document.querySelectorAll('.btn-remove-ex').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                cfgExercises.splice(idx, 1);
                renderExercises();
                syncConfigToTimer();
            });
        });
    }

    function addExercise() {
        const val = inputExercise.value.trim();
        if (val) {
            cfgExercises.push(val);
            inputExercise.value = '';
            renderExercises();
            syncConfigToTimer();
        }
    }

    btnAddExercise.addEventListener('click', addExercise);
    inputExercise.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addExercise();
    });

    function syncConfigToTimer() {
        if (timer.state === 'READY') {
            const w = parseInt(valWork.innerText);
            const r = parseInt(valRest.innerText);
            const s = parseInt(valSets.innerText);
            cfgWork = w;
            cfgRest = r;
            cfgSets = s;
            cfgSkipLastRest = checkSkipLastRest.checked;
            timer.updateConfig(w, r, s, cfgExercises, cfgSkipLastRest);
            elSets.innerText = `Set 0 / ${s}`;
            elDisplay.innerText = timer.formatTime(w);
            updateTotalDuration(w, r, s);
        }
    }

    function updateTotalDuration(w, r, s) {
        const numExos = Math.max(1, cfgExercises.length);
        const totalSec = ((w + r) * numExos * s) - (cfgSkipLastRest ? r : 0);
        displayTotalTime.innerText = timer.formatTime(Math.max(0, totalSec));
    }

    // Mute Logic
    btnMute.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
            iconSoundOn.classList.add('hidden');
            iconSoundOff.classList.remove('hidden');
            btnMute.classList.replace('text-gray-400', 'text-red-500');
        } else {
            iconSoundOn.classList.remove('hidden');
            iconSoundOff.classList.add('hidden');
            btnMute.classList.replace('text-red-500', 'text-gray-400');
        }
    });

    // Skip Last Rest toggle
    checkSkipLastRest.addEventListener('change', () => {
        cfgSkipLastRest = checkSkipLastRest.checked;
        timer.config.skipLastRest = cfgSkipLastRest;
        const w = parseInt(valWork.innerText);
        const r = parseInt(valRest.innerText);
        const s = parseInt(valSets.innerText);
        updateTotalDuration(w, r, s);
    });

    // Presets Logic
    function renderPresets() {
        presetsContainer.innerHTML = '';
        Object.keys(savedLists).forEach(name => {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'flex items-stretch';
            
            const btnLoad = document.createElement('button');
            btnLoad.className = 'text-xs bg-gray-800 px-3 py-1 rounded-l text-gray-300 hover:text-white border border-gray-700 active:bg-gray-700 font-bold';
            btnLoad.innerText = name;
            btnLoad.addEventListener('click', () => {
                cfgExercises = [...savedLists[name]];
                renderExercises();
                syncConfigToTimer();
            });

            const btnDel = document.createElement('button');
            btnDel.className = 'text-xs bg-gray-800 px-2 py-1 rounded-r text-red-500 hover:text-red-400 border-t border-b border-r border-gray-700 active:bg-gray-700';
            btnDel.innerText = 'x';
            btnDel.addEventListener('click', () => {
                if (confirm(`Supprimer la liste "${name}" ?`)) {
                    delete savedLists[name];
                    localStorage.setItem('kettlebellSavedLists', JSON.stringify(savedLists));
                    renderPresets();
                }
            });

            btnGroup.appendChild(btnLoad);
            btnGroup.appendChild(btnDel);
            presetsContainer.appendChild(btnGroup);
        });
    }

    btnSaveList.addEventListener('click', () => {
        if (cfgExercises.length === 0) {
            alert('Ajoutez des exercices avant de sauvegarder.');
            return;
        }
        const name = prompt('Nom de la liste :');
        if (name && name.trim() !== '') {
            savedLists[name.trim()] = [...cfgExercises];
            localStorage.setItem('kettlebellSavedLists', JSON.stringify(savedLists));
            renderPresets();
        }
    });

    timer.onTick = (timeStr) => {
        elDisplay.innerText = timeStr;
    };

    timer.onStateChange = (state, currentSet, exerciseName) => {
        elStatus.innerText = state === 'WORK' ? exerciseName : state;
        elSets.innerText = `Set ${currentSet} / ${cfgSets}`;

        // Reset visual state
        elMain.className = 'flex-1 flex flex-col min-h-0 relative transition-colors duration-300';
        elDisplay.className = 'text-[min(25vw,30vh)] leading-none font-timer font-bold tabular-nums';
        btnStart.className = 'btn-massive transition-colors';

        if (state === 'READY') {
            elMain.classList.add('bg-black');
            elDisplay.classList.add('text-fluo');
            btnStart.classList.add('bg-fluo', 'text-black', 'w-full');
            btnStart.innerText = 'Start';
            btnReset.style.display = 'none';
            confSection.classList.remove('hidden');
            elTimerScreen.classList.add('hidden');
        } else if (state === 'WORK') {
            elMain.classList.add('bg-work');
            elDisplay.classList.add('text-white');
            elStatus.classList.replace('text-gray-400', 'text-white');
            elSets.classList.replace('text-gray-400', 'text-white');
            btnStart.classList.add('bg-white', 'text-work', 'w-2/3');
            btnStart.innerText = 'Pause';
            btnReset.disabled = false;
            btnReset.style.display = 'flex';
            confSection.classList.add('hidden');
            elTimerScreen.classList.remove('hidden');
        } else if (state === 'REST') {
            elMain.classList.add('bg-rest');
            elDisplay.classList.add('text-white');
            elStatus.classList.replace('text-gray-400', 'text-white');
            elSets.classList.replace('text-gray-400', 'text-white');
            btnStart.classList.add('bg-white', 'text-rest', 'w-2/3');
            btnStart.innerText = 'Pause';
            btnReset.disabled = false;
            btnReset.style.display = 'flex';
            confSection.classList.add('hidden');
            elTimerScreen.classList.remove('hidden');
        } else if (state === 'DONE') {
            elMain.classList.add('bg-black');
            elDisplay.classList.add('text-fluo');
            
            // Revert styles safely
            elStatus.className = 'text-gray-400 text-2xl uppercase tracking-[0.2em] mb-2 font-bold';
            elSets.className = 'text-gray-400 text-xl mt-4 uppercase tracking-widest font-bold';
            
            btnStart.classList.add('bg-fluo', 'text-black', 'w-2/3');
            btnStart.innerText = 'Start';
            btnReset.disabled = false;
            btnReset.style.display = 'flex';
            confSection.classList.add('hidden');
            elTimerScreen.classList.remove('hidden');
        }
    };

    timer.onBeep = (type) => {
        playBeep(type);
    };

    timer.onComplete = async () => {
        btnStart.innerText = "Done!";

        // Save session to IndexedDB
        const numExos = Math.max(1, cfgExercises.length);
        const totalSec = ((cfgWork + cfgRest) * numExos * cfgSets) - (cfgSkipLastRest ? cfgRest : 0);
        
        const sessionData = {
            duration: totalSec,
            weight: cfgWeight,
            exercises: [...cfgExercises],
            sets: cfgSets,
            work: cfgWork,
            rest: cfgRest
        };
        try {
            await kbMetrics.saveSession(sessionData);
        } catch (e) {
            console.error("Failed to save session", e);
        }

        setTimeout(() => {
            if(timer.state === 'DONE') {
                btnStart.innerText = "Start";
                timer.reset();
            }
        }, 5000);
    };

    // Events Start / Reset
    btnStart.addEventListener('click', () => {
        // Init Audio on first user interaction to bypass browser autoplay policy
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (timer.state === 'DONE') {
            timer.reset();
            return;
        }

        if (timer.isRunning) {
            timer.pause();
            btnStart.innerText = 'Resume';
        } else {
            // we might have updated config manually
            const w = parseInt(valWork.innerText);
            const r = parseInt(valRest.innerText);
            const s = parseInt(valSets.innerText);
            cfgWork = w;
            cfgRest = r;
            cfgSets = s;
            cfgSkipLastRest = checkSkipLastRest.checked;
            timer.updateConfig(w, r, s, cfgExercises, cfgSkipLastRest);

            // Manual tick hack loop
            let lastTick = performance.now();
            const doTick = (t) => {
                if(timer.isRunning) {
                    const delta = (t - lastTick) / 1000;
                    lastTick = t;
                    // Timer loop handled by requestAnimationFrame in class KettlebellTimer
                    // actually handled by timer.tick() recursive call, but it's okay we use RAF inside Timer Class
                } else {
                    lastTick = t;
                }
                if (timer.isRunning) requestAnimationFrame(doTick);
            };

            timer.start();
            
            // start the ticker
            lastTick = performance.now();
            if (timer.isRunning) requestAnimationFrame(doTick);
        }
    });

    btnReset.addEventListener('click', () => {
        timer.reset();
    });

    // Control Setup Interactions
    const setupHandlers = [
        { btn: 'btn-work-dec', el: valWork, change: -5, min: 5 },
        { btn: 'btn-work-inc', el: valWork, change: 5, max: 300 },
        { btn: 'btn-rest-dec', el: valRest, change: -5, min: 0 },
        { btn: 'btn-rest-inc', el: valRest, change: 5, max: 300 },
        { btn: 'btn-sets-dec', el: valSets, change: -1, min: 1 },
        { btn: 'btn-sets-inc', el: valSets, change: 1, max: 50 },
        { btn: 'btn-weight-dec', el: valWeight, change: -2, min: 2 },
        { btn: 'btn-weight-inc', el: valWeight, change: 2, max: 100 }
    ];

    setupHandlers.forEach(h => {
        const btn = document.getElementById(h.btn);
        btn.addEventListener('click', () => {
            let val = parseInt(h.el.innerText);
            val += h.change;
            if (h.min !== undefined && val < h.min) val = h.min;
            if (h.max !== undefined && val > h.max) val = h.max;
            h.el.innerText = val;
            
            // update if in ready
            if (h.el === valWeight) {
                cfgWeight = parseInt(h.el.innerText);
            }
            syncConfigToTimer();
        });
    });

    // History Logic
    function formatHistoryDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    async function showHistory() {
        screenHistory.classList.remove('hidden');
        historyContainer.innerHTML = '<div class="text-center text-gray-500 py-4 font-bold">Loading...</div>';
        try {
            const history = await kbMetrics.getHistory();
            if (history.length === 0) {
                historyContainer.innerHTML = '<div class="text-center text-gray-500 py-4 font-bold">No sessions yet.</div>';
                return;
            }
            historyContainer.innerHTML = '';
            history.forEach(s => {
                const el = document.createElement('div');
                el.className = 'bg-gray-900 rounded-xl p-4 flex flex-col gap-2 border border-gray-800';
                
                const exosText = s.exercises && s.exercises.length > 0 ? s.exercises.join(', ') : 'Interval';
                const timeText = timer.formatTime(s.duration);
                const weightText = s.weight ? s.weight + ' kg' : '--';

                el.innerHTML = `
                    <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span class="font-bold text-fluo">${formatHistoryDate(s.date)}</span>
                        <span class="text-white font-bold tracking-wider text-lg">${timeText}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm pt-1 mt-1">
                        <span class="text-gray-400 max-w-[50%] truncate font-bold" title="${exosText}">${exosText}</span>
                        <div class="flex items-center gap-3">
                            <span class="text-gray-400 font-bold"><strong class="text-white">${s.sets}</strong> sets</span>
                            <span class="bg-gray-800 px-2 py-1 flex items-center justify-center rounded-lg text-fluo font-bold">${weightText}</span>
                        </div>
                    </div>
                `;
                historyContainer.appendChild(el);
            });
        } catch (e) {
            historyContainer.innerHTML = '<div class="text-center text-red-500 py-4 font-bold">Error loading history</div>';
        }
    }

    btnHistory.addEventListener('click', showHistory);
    btnCloseHistory.addEventListener('click', () => screenHistory.classList.add('hidden'));
    btnClearHistory.addEventListener('click', async () => {
        if (confirm("Effacer tout l'historique ? Cette action est irréversible.")) {
            await kbMetrics.clearHistory();
            showHistory();
        }
    });

    // Initial Display
    renderPresets();
    renderExercises();
    elDisplay.innerText = timer.formatTime(cfgWork);
    elSets.innerText = `Set 0 / ${cfgSets}`;
    updateTotalDuration(cfgWork, cfgRest, cfgSets);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('Service Worker Registered!', reg))
                .catch(err => console.error('Service Worker Registration Failed:', err));
        });
    }

});
