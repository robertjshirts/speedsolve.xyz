<script setup lang="ts">
import { useAuth } from '~/composables/useAuth';

const { loading, authenticated, username, login, logout } = useAuth();
</script>

<template>
  <div class="fixed top-0 z-50 w-full border-b bg-white bg-opacity-80 backdrop-blur">
    <div class="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
      <span class="text-xl font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
        Speedsolve.xyz
      </span>
      <div class="flex space-x-12">
        <a href="#" class="text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out">
          Solo
        </a>
        <a href="#" class="text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out">
          Multiplayer
        </a>
      </div>
      <span v-if="loading" class="text-gray-500 animate-pulse">
        Loading...
      </span>
      <div v-else-if="authenticated" class="flex items-center space-x-4">
        <span class="text-gray-700">{{ username }}</span>
        <button @click="logout"
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 ease-in-out">
          Logout
        </button>
      </div>
      <button v-else @click="login"
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 ease-in-out">
        Login
      </button>
    </div>
  </div>
</template>

<!-- 
<template>
  <div class="fixed top-0 z-50 w-full border-b bg-inherit backdrop-blur">
    <div class="mx-auto flex max-w-screen-xl justify-between px-4 py-3">
      <span>Speedsolve.xyz</span>
      <span>Solo</span>
      <span>Multiplayer</span>
      <span v-if="loading">Loading...</span>
      <div v-else-if="authenticated" class="">
        <span>{{ username }}</span>
        <button @click="logout">Logout</button>
      </div>
      <button v-else @click="login">Login</button>
    </div>
  </div>
</template>
-->
