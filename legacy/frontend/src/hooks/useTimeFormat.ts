export const useTimeFormat = () => {
  const formatTime = (ms: number) => (ms/1000).toFixed(2);
  return { formatTime }
}