export function formatLink(name: string, url: string): string {
  return `[${name}](${url})`;
}

export function getResultStr(quorumDistance: number, passed: boolean) {
  if (quorumDistance > 0) {
    return "No quorum";
  } else if (!passed) {
    return "No minimal approval";
  } else {
    return "Minimal approval reached";
  }
}

const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

export function abbreviateNumber(number: number): string {
  // what tier? (determines SI symbol)
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier == 0) return Math.round(number).toString();

  // get suffix and determine scale
  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);

  // scale the number
  const scaled = number / scale;

  // format number and add suffix
  return scaled.toFixed(1) + suffix;
}

export function secondsToDaysAndHours(seconds: number): string {
  const timeStrings = [];
  if (seconds >= 3600 * 24) {
    const days = Math.floor(seconds / (3600 * 24));
    seconds %= 3600 * 24;
    timeStrings.push(`${days.toFixed(0)} ${days > 1 ? "days" : "day"}`);
  }
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) {
    timeStrings.push(`${hours.toFixed(0)} ${hours > 1 ? "hours" : "hour"}`);
  }
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  if (timeStrings.length < 2 && minutes > 0) {
    timeStrings.push(`${minutes.toFixed(0)} ${minutes > 1 ? "mins" : "min"}`);
  }
  if (timeStrings.length == 0) {
    return "less than a minute";
  }
  return timeStrings.join(" ");
}
