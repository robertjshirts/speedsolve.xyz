export function useCubeTimer() {
    const timer = ref(0);
    let timerInterval: number | null = null;

    function startTimer() {
        // Reset the timer when starting
        timer.value = 0;
        timerInterval = window.setInterval(() => {
            timer.value += 0.01; // Increment by 0.01 seconds (10ms)
        }, 10);
    }

    function stopTimer() {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetTimer() {
        stopTimer(); // Stop the interval if it's running
        timer.value = 0; // Reset timer to zero
    }

    return {
        timer,
        startTimer,
        stopTimer,
        resetTimer
    };
}
