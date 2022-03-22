import { Event } from "ethers";

export function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

export const byBlockNumberDesc = (e1: Event, e2: Event) => e2.blockNumber - e1.blockNumber;
