<script setup lang="ts">
const modal = useModal();
const { username } = useAuth();
const { formatTime } = useTimeFormat();

const props = defineProps<{
  session: CompetitionState;
}>();
const emit = defineEmits<{
  'updatePenalty': [type: Penalty];
  'close': [];
}>();

function closeModal() {
  emit('close');
  modal.close();
}


// might not need to be computed.
const timeWithPenalty = computed(() => {
  let time = props.session.results[username.value].time;
  let penalty = props.session.results[username.value].penalty;
  if (penalty === 'plus2') {
    time += 2000;
    return `${formatTime(time)}+`;
  }
  if (penalty === 'DNF') {
    return `DNF(${formatTime(time)})`;
  }
  return formatTime(time);
})


</script>


<template>
  <UModal>
    <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            Solve Complete
          </h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="closeModal" />
        </div>
      </template>

      <div class="p-6">
        <div class="text-6xl font-mono text-center py-4">
          {{ timeWithPenalty }}
        </div>



        <label class="text-sm font-medium text-gray-700 dark:text-gray-400 block mb-2">Update Penalty:</label>
        <div class="space-x-4">
          <button @click="$emit('updatePenalty', 'none')"
            class="px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700">
            None
          </button>
          <button @click="$emit('updatePenalty', 'plus2')"
            class="px-4 py-2 bg-blue-600 text-white text-lg rounded hover:bg-blue-700">
            +2
          </button>
          <button @click="$emit('updatePenalty', 'DNF')"
            class="px-4 py-2 bg-red-600 text-white text-lg rounded hover:bg-red-700">
            DNF
          </button>
        </div>
      </div>
    </UCard>
  </UModal>
</template>
