<script setup lang="ts">
const modal = useModal();
const { username } = useAuth();

const props = defineProps<{
  session: CompetitionState;
}>();


function closeModal() {
  modal.close();
}

defineEmits(['update-penalty']);
</script>


<template>
  <UModal :overlay="false">
    <div class="w-full max-w-md rounde-lg shadow-xl">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Modal
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1"
              @click="closeModal" />
          </div>
        </template>

        <div class="p-6">
          <h2 class="text-lg font-medium text-gray-900 text-center">
            Solve Complete
          </h2>
          <h4>
            {{ session.results[username].time.toFixed(2) }}s
          </h4>
          <span class="text-sm text-gray-600">Penalty: {{ session.results[username].penalty }}</span>

          <div class="mt-4">
            <div class="text-4xl font-mono text-center py-4">
              {{ session.results[username].time.toFixed(2) }}s
            </div>

            <label class="text-sm font-medium text-gray-700 block mb-2">Update Penalty:</label>
            <div class="space-x-4">
              <button @click="$emit('update-penalty', 'none')"
                class="px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700">
                None
              </button>
              <button @click="$emit('update-penalty', 'plus2')"
                class="px-4 py-2 bg-blue-600 text-white text-lg rounded hover:bg-blue-700">
                +2
              </button>
              <button @click="$emit('update-penalty', 'DNF')"
                class="px-4 py-2 bg-red-600 text-white text-lg rounded hover:bg-red-700">
                DNF
              </button>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UModal>

  <!-- 
  <div class="fixed inset-0 overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 class="text-lg font-medium text-gray-900 text-center">
          Solve Complete
        </h2>
        <h4>
          {{ session.results[username].time.toFixed(2) }}s
        </h4>
        <span class="text-sm text-gray-600">Penalty: {{ session.results[username].penalty }}</span>

        <div class="mt-4">
          <div class="text-4xl font-mono text-center py-4">
            {{ session.results[username].time.toFixed(2) }}s
          </div>

          <label class="text-sm font-medium text-gray-700 block mb-2">Update Penalty:</label>
          <div class="space-x-4">
            <button @click="$emit('update-penalty', 'none')"
              class="px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700">
              None
            </button>
            <button @click="$emit('update-penalty', 'plus2')"
              class="px-4 py-2 bg-blue-600 text-white text-lg rounded hover:bg-blue-700">
              +2
            </button>
            <button @click="$emit('update-penalty', 'DNF')"
              class="px-4 py-2 bg-red-600 text-white text-lg rounded hover:bg-red-700">
              DNF
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
-->
</template>
