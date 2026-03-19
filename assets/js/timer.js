/*
 * MIT License
 *
 * Copyright (c) 2026 Perrin David (weldod)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class KettlebellTimer {
    constructor(workSec, restSec, sets, exercises = [], skipLastRest = true) {
        this.config = { work: workSec, rest: restSec, sets: sets, exercises: exercises, skipLastRest: skipLastRest };
        this.state = 'READY'; // READY, WORK, REST, DONE
        this.currentSet = 1;
        this.currentExerciseIndex = 0;
        this.timeLeft = workSec;
        this.isRunning = false;
        this.intervalId = null;

        // Callbacks
        this.onTick = null;
        this.onStateChange = null;
        this.onComplete = null;
        this.onBeep = null;
    }

    start() {
        if (this.state === 'DONE') this.reset();
        if (this.isRunning) return;

        if (this.state === 'READY') {
            this.state = 'WORK';
            this.timeLeft = this.config.work;
            if (this.onStateChange) this.onStateChange(this.state, this.currentSet, this.getExerciseName());
            this.notifyBeep('long'); // Départ
        }

        this.isRunning = true;
        this.lastTime = Date.now();
        this.tick();
    }

    pause() {
        this.isRunning = false;
        if (this.intervalId) {
            cancelAnimationFrame(this.intervalId);
            this.intervalId = null;
        }
    }

    reset() {
        this.pause();
        this.state = 'READY';
        this.currentSet = 1;
        this.currentExerciseIndex = 0;
        this.timeLeft = this.config.work;
        if (this.onStateChange) this.onStateChange(this.state, this.currentSet, this.getExerciseName());
        if (this.onTick) this.onTick(this.formatTime(this.timeLeft));
    }

    tick() {
        if (!this.isRunning) return;

        const now = Date.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.timeLeft -= delta;

        // Beeps handling
        if (this.timeLeft > 0 && this.timeLeft <= 3.5) {
            // Un peu de logique pour les 3 bips avant la fin
            // On le fera de manière simple dans l'UI via les événements 
            // ou en vérifiant le passage exact des secondes : 3, 2, 1.
            const ceiled = Math.ceil(this.timeLeft);
            if (this.lastCeiled !== ceiled) {
                this.lastCeiled = ceiled;
                if (ceiled > 0 && ceiled <= 3) {
                    this.notifyBeep('short');
                }
            }
        }

        if (this.timeLeft <= 0) {
            this.transitionState();
        } else {
            if (this.onTick) this.onTick(this.formatTime(Math.ceil(this.timeLeft)));
            this.intervalId = requestAnimationFrame(() => this.tick());
        }
    }

    getExerciseName() {
        if (this.config.exercises.length === 0) return 'WORK';
        let idx = this.currentExerciseIndex;
        if (idx >= this.config.exercises.length) {
            idx = 0;
        }
        return this.config.exercises[idx] || 'WORK';
    }

    completeTimer() {
        this.state = 'DONE';
        this.isRunning = false;
        this.timeLeft = 0;
        if (this.onTick) this.onTick('00:00');
        if (this.onStateChange) this.onStateChange(this.state, this.currentSet, 'DONE');
        if (this.onComplete) this.onComplete();
    }

    transitionState() {
        this.notifyBeep('long'); // Changement d'état

        const numExercises = Math.max(1, this.config.exercises.length);

        if (this.state === 'WORK') {
            this.currentExerciseIndex++;

            if (this.currentExerciseIndex >= numExercises) {
                // Fini les exos pour ce set
                if (this.currentSet >= this.config.sets && this.config.skipLastRest) {
                    this.completeTimer();
                    return;
                }
            }

            // Dans tous les autres cas de fin de WORK, on passe en REST
            this.state = 'REST';
            this.timeLeft = this.config.rest;

        } else if (this.state === 'REST') {
            if (this.currentExerciseIndex >= numExercises && this.currentSet >= this.config.sets) {
                // Fini le tout dernier temps de repos qui n'a pas été zappé !
                this.completeTimer();
                return;
            }

            // Passage au travail
            if (this.currentExerciseIndex >= numExercises) {
                // On vient de terminer le dernier exercice et son repos
                this.currentSet++;
                this.currentExerciseIndex = 0;
            }
            this.state = 'WORK';
            this.timeLeft = this.config.work;
        }

        this.lastCeiled = null;
        if (this.onStateChange) this.onStateChange(this.state, this.currentSet, this.getExerciseName());
        if (this.onTick) this.onTick(this.formatTime(Math.ceil(this.timeLeft)));
        this.lastTime = Date.now();
        this.intervalId = requestAnimationFrame(() => this.tick());
    }

    notifyBeep(type) {
        if (this.onBeep) this.onBeep(type);
    }

    formatTime(seconds) {
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        const remS = s % 60;
        return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }

    updateConfig(work, rest, sets, exercises = [], skipLastRest = true) {
        this.config = { work, rest, sets, exercises, skipLastRest };
        if (this.state === 'READY') {
            this.timeLeft = work;
            if (this.onTick) this.onTick(this.formatTime(this.timeLeft));
        }
    }
}
