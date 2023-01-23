import { Event } from "ethers";
import { ethersProvider } from "../ethers";
import { EASY_TRACK_TYPES_BY_FACTORIES, LIDO_ORACLES } from "../constants";

export async function isContract(address: string): Promise<boolean> {
  return (await ethersProvider.getCode(address)) != "0x";
}

export const byBlockNumberDesc = (e1: Event, e2: Event) =>
  e2.blockNumber - e1.blockNumber;

export const getOracleName = (oracleAddress: string) => {
  return LIDO_ORACLES.get(oracleAddress) || "Unknown";
};

export const getMotionType = (evmScriptFactory: string) => {
  return (
    EASY_TRACK_TYPES_BY_FACTORIES.get(evmScriptFactory.toLowerCase()) || "New "
  );
};

export const getMotionLink = (motionId: string) => {
  return `[${motionId}](https://easytrack.lido.fi/motions/${motionId})`;
};
