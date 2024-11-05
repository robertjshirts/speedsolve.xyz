<script setup lang="ts">
const modal = useModal()
const { username } = useAuth()
const { formatTime } = useTimeFormat()
const store = useCompetitionStore()
const { updatePenalty } = useCompetition()

const emit = defineEmits<{
  close: []
}>()

function closeModal() {
  emit('close')
  modal.close()
}

function handlePenaltyUpdate(penalty: Penalty) {
  updatePenalty(penalty)
}

const timeWithPenalty = computed(() => {
  if (!store.session?.results[username.value]) return '--:--'

  let time = store.session.results[username.value].time
  let penalty = store.session.results[username.value].penalty

  if (penalty === 'plus2') {
    time += 2000
    return `${formatTime(time)}+`
  }
  if (penalty === 'DNF') {
    return `DNF(${formatTime(time)})`
  }
  return formatTime(time)
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

        <label class="text-sm font-medium text-gray-700 dark:text-gray-400 block mb-2">
          Update Penalty:
        </label>

        <div class="space-x-4">
          <button v-for="(label, type) in {
            none: 'None',
            plus2: '+2',
            DNF: 'DNF'
          }" :key="type" @click="handlePenaltyUpdate(type as Penalty)" class="px-4 py-2 text-white text-lg rounded"
            :class="{
              'bg-green-600 hover:bg-green-700': type === 'none',
              'bg-blue-600 hover:bg-blue-700': type === 'plus2',
              'bg-red-600 hover:bg-red-700': type === 'DNF'
            }">
            {{ label }}
          </button>
        </div>
      </div>
    </UCard>
  </UModal>
</template>
