import { useState, useRef } from 'react'

export const useCubeTimer = () => {
  const [time, setTime] = useState(0)
  const timerIntervalRef = useRef<number | null>(null)
  const spacebarPressTimeRef = useRef<number | null>(null)

  function startTimer() {
    setTime(0)
    timerIntervalRef.current = window.setInterval(() => {
      setTime(prevTime => prevTime + 10)
    }, 10)
  }

  function stopTimer() {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  function resetTimer() {
    stopTimer()
    setTime(0)
    spacebarPressTimeRef.current = null
  }


  return { 
    time, 
    startTimer, 
    stopTimer, 
    resetTimer,
  }
}
