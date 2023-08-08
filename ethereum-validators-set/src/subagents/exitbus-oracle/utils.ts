import { Event } from "ethers";

export const byBlockNumberDesc = (e1: Event, e2: Event) =>
  e2.blockNumber - e1.blockNumber;

export const getMemberName = (
  members: Map<string, string>,
  memberAdress: string,
) => {
  return members.get(memberAdress) || "Unknown";
};
