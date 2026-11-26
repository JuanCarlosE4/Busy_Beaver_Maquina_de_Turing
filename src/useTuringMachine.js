import { ref, reactive } from 'vue';

export function useTuringMachine(externalRules) {
  const tape = reactive({});
  const head = ref(0);
  const state = ref('A');
  const steps = ref(0);
  const isRunning = ref(false);

  const cellVisits = reactive({});
  const maxVisits = ref(1);

  const step = () => {
    // Si ya estamos en HALT, bloqueamos ejecución
    if (state.value === 'HALT') {
      isRunning.value = false;
      return;
    }

    const currentValue = tape[head.value] || 0;

    // Accedemos a las reglas externas proporcionadas por la UI
    const stateRules = externalRules[state.value];
    if (!stateRules) return;

    const rule = stateRules[currentValue];

    if (rule) {
      // 1. Actualizar Mapa de Calor
      cellVisits[head.value] = (cellVisits[head.value] || 0) + 1;
      if (cellVisits[head.value] > maxVisits.value) {
        maxVisits.value = cellVisits[head.value];
      }

      // 2. Ejecutar Acción (Escritura -> Movimiento -> Cambio de Estado)
      tape[head.value] = rule.write;
      head.value += rule.move;
      state.value = rule.next;
      steps.value++;
    }
  };

  const resetMachine = () => {
    // Limpieza reactiva profunda (Principio de inmutabilidad/SPA)
    Object.keys(tape).forEach(key => delete tape[key]);
    Object.keys(cellVisits).forEach(key => delete cellVisits[key]);
    head.value = 0;
    state.value = 'A';
    steps.value = 0;
    maxVisits.value = 1;
    isRunning.value = false;
  };

  return {
    tape, head, state, steps, isRunning,
    step, cellVisits, maxVisits, resetMachine
  };
};