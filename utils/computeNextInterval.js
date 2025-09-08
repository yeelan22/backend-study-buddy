export function computeNextInterval(prevInterval, quality, wrongCount = 0) {
  const easeFactors = { 5: 2.5, 3: 2.0, 1: 1.3 };
  let ef = easeFactors[quality];
  if (wrongCount > 0) ef *= 0.8; // penalize if there were mistakes
  return Math.max(1, Math.round(prevInterval * ef));
}
