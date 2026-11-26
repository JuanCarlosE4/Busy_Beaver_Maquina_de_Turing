<template>
  <div class="p-8 bg-gray-900 text-white min-h-screen font-mono">
    <header class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-emerald-500">Busy Beaver</h1>
        <p class="text-gray-400 text-sm">Configuración dinámica de n-estados</p>
      </div>

      <div class="flex items-center gap-6">
        <div class="flex flex-col items-end">
          <span class="text-xs text-gray-500 uppercase">Estado Actual</span>
          <span class="text-2xl font-bold" :class="state === 'HALT' ? 'text-red-500' : 'text-emerald-400'">
            {{ state }}
          </span>
        </div>
        <div class="h-10 w-px bg-gray-700"></div>
        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <label class="text-xs text-yellow-500 block mb-1">CANTIDAD DE ESTADOS</label>
          <select v-model.number="numStates" @change="reset" class="bg-gray-800 rounded border border-gray-600 px-1">
            <option v-for="n in 4" :key="n" :value="n">{{ n }} Estados</option>
          </select>
        </div>
      </div>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      <div v-for="sName in activeStates" :key="sName"
        class="p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-xl transition-all"
        :class="{ 'ring-2 ring-emerald-500 bg-gray-750': state === sName }">

        <h2 class="text-lg font-bold mb-4 text-emerald-400 border-b border-gray-700 pb-2">
          Estado {{ sName }}
        </h2>

        <div v-for="v in [0, 1]" :key="v"
          class="mb-4 last:mb-0 bg-gray-900/40 p-3 rounded-lg border border-gray-700/50">
          <p class="text-[10px] text-gray-500 mb-2 uppercase tracking-tighter">Si la cinta lee: <span
              class="text-white">{{ v }}</span></p>

          <div class="grid grid-cols-1 gap-2">
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">Escribir:</span>
              <select v-model.number="configRules[sName][v].write"
                class="bg-gray-800 rounded border border-gray-600 px-1">
                <option :value="0">0</option>
                <option :value="1">1</option>
              </select>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">Mover:</span>
              <select v-model.number="configRules[sName][v].move"
                class="bg-gray-800 rounded border border-gray-600 px-1">
                <option :value="-1">L (Izq)</option>
                <option :value="1">R (Der)</option>
              </select>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">Siguiente:</span>
              <select v-model="configRules[sName][v].next" class="bg-gray-800 rounded border border-gray-600 px-1">
                <option v-for="opt in nextStateOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl mb-8 overflow-hidden">
      <div class="px-6 py-3 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center">
        <span class="text-[20px] text-gray-500 uppercase tracking-widest">Cinta Proyectada (Use scroll para
          explorar)</span>
        <div class="flex gap-4 text-[20px]">
          <span>Pasos: <b class="text-emerald-400">{{ steps }}</b></span>
          <span>Posición: <b class="text-purple-400">{{ head }}</b></span>
        </div>
      </div>

      <div
        class="flex items-center gap-1 p-14 overflow-x-auto custom-scrollbar bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
        <div v-for="idx in visibleRange" :key="idx"
          class="w-14 h-14 flex-shrink-0 flex items-center justify-center border transition-all duration-300 relative font-bold text-xl rounded-lg"
          :class="idx === head ? 'border-emerald-400 scale-110 shadow-lg bg-gray-800 z-10' : 'border-gray-800 bg-gray-900/90'"
          :style="getHeatMapStyle(idx)">

          <span class="absolute -top-7 text-[9px] text-gray-600 font-normal">{{ idx }}</span>
          {{ tape[idx] || 0 }}
        </div>
      </div>
    </div>

    <div class="flex gap-4 justify-center">
      <button @click="togglePlay"
        :class="isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'"
        class="px-10 py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-3">
        <component :is="isRunning ? 'PauseIcon' : 'PlayIcon'" class="w-5 h-5" />
        {{ isRunning ? 'PAUSAR SIMULACIÓN' : 'INICIAR MÁQUINA' }}
      </button>

      <button @click="reset"
        class="px-10 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all transform active:scale-95">
        RESETEAR
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useTuringMachine } from '../useTuringMachine';

// --- CONFIGURACIÓN DINÁMICA DE ESTADOS ---
const numStates = ref(1);
const allPossibleStates = ['A', 'B', 'C', 'D'];

const activeStates = computed(() => allPossibleStates.slice(0, numStates.value));
const nextStateOptions = computed(() => [...activeStates.value, 'HALT']);

const configRules = reactive({});

// Inicializa las reglas cada vez que cambia el número de estados
const setupRules = () => {
  activeStates.value.forEach(s => {
    if (!configRules[s]) {
      configRules[s] = {
        0: { write: 1, move: 1, next: 'HALT' },
        1: { write: 1, move: -1, next: 'HALT' }
      };
    }
  });
  // Limpia estados sobrantes
  Object.keys(configRules).forEach(k => {
    if (!activeStates.value.includes(k)) delete configRules[k];
  });
};

watch(numStates, setupRules, { immediate: true });

// --- MOTOR DE LA MÁQUINA ---
const { tape, head, state, steps, isRunning, step, cellVisits, maxVisits, resetMachine } = useTuringMachine(configRules);
const timer = ref(null);

// --- LÓGICA DE VISUALIZACIÓN (OPCIÓN 2: LÍMITES DINÁMICOS) ---
const tapeBoundaries = computed(() => {
  const keys = Object.keys(tape).map(Number);
  if (keys.length === 0) return { min: head.value - 5, max: head.value + 5 };

  return {
    min: Math.min(...keys, head.value) - 3,
    max: Math.max(...keys, head.value) + 3
  };
});

const visibleRange = computed(() => {
  const range = [];
  for (let i = tapeBoundaries.value.min; i <= tapeBoundaries.value.max; i++) range.push(i);
  return range;
});

const getHeatMapStyle = (index) => {
  const visits = cellVisits[index] || 0;
  if (visits === 0) return {};
  const intensity = 0.1 + (Math.log(visits + 1) / Math.log(maxVisits.value + 1)) * 0.8;
  return {
    backgroundColor: `rgba(16, 185, 129, ${intensity})`,
    borderColor: `rgba(52, 211, 153, ${intensity + 0.1})`
  };
};

// --- CICLO DE VIDA / EJECUCIÓN ---
const togglePlay = () => isRunning.value ? stop() : start();

const start = () => {
  if (state.value === 'HALT') return;
  isRunning.value = true;
  timer.value = setInterval(() => {
    if (state.value === 'HALT') stop();
    else step();
  }, 100);
};

const stop = () => {
  isRunning.value = false;
  clearInterval(timer.value);
};

const reset = () => {
  stop();
  resetMachine();
};

// Componentes mínimos de iconos (puedes usar FontAwesome si prefieres)
const PlayIcon = { template: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' };
const PauseIcon = { template: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' };
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #020617;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 10px;
  border: 2px solid #020617;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #10b981;
}

.bg-gray-750 {
  background-color: #262f3f;
}
</style>