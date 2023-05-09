import { Event } from "ethers";
import BigNumber from "bignumber.js";

export const LIDO_ORACLES = new Map<string, string>([
  ["0x140bd8fbdc884f48da7cb1c09be8a2fadfea776e", "Chorus One"],
  ["0x1d0813bf088be3047d827d98524fbf779bc25f00", "Chorus One"],
  ["0x404335bce530400a5814375e7ec1fb55faff3ea2", "Staking Facilities"],
  ["0x007de4a5f7bc37e2f26c0cb2e8a95006ee9b89b5", "P2P Validator"],
  ["0x946d3b081ed19173dc83cd974fc69e1e760b7d78", "Stakefish"],
  ["0xec4bfbaf681eb505b94e4a7849877dc6c600ca3a", "Rated"],
  ["0x61c91ecd902eb56e314bb2d5c5c07785444ea1c8", "bloXroute"],
  ["0x1ca0fec59b86f549e1f1184d97cb47794c8af58d", "Instadapp"],
  ["0xa7410857abbf75043d61ea54e07d57a6eb6ef186", "Kyber Network"],
]);

const TEN_TO_18 = new BigNumber(10).pow(18);

export const byBlockNumberDesc = (e1: Event, e2: Event) =>
  e2.blockNumber - e1.blockNumber;

export const getOracleName = (oracleAddress: string) => {
  return LIDO_ORACLES.get(oracleAddress) || "Unknown";
};

export function formatEth(amount: any, dp: number): string {
  return new BigNumber(String(amount)).div(TEN_TO_18).toFixed(dp);
}

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
