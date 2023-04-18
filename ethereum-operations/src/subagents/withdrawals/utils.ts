export function formatDelay(fullDelaySec: number) {
  let sign = fullDelaySec >= 0 ? 1 : -1;
  let delayHours = 0;
  let delayMin = Math.floor((sign * fullDelaySec) / 60);
  let delaySec = sign * fullDelaySec - delayMin * 60;
  if (delayMin >= 60) {
    delayHours = Math.floor(delayMin / 60);
    delayMin -= delayHours * 60;
  }
  return (
    (sign == 1 ? "" : "-") +
    (delayHours > 0 ? `${delayHours} hrs ` : "") +
    (delayMin > 0 ? `${delayMin} min ` : "") +
    `${delaySec} sec`
  );
}
