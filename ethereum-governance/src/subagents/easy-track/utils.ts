import { ethers } from "forta-agent";
import TOP_UP_ALLOWED_RECIPIENTS_ABI from "../../abi/TopUpAllowedRecipients.json";
import { ethersProvider } from "../../ethers";
import { STONKS } from "../stonks-order-watcher/constants";

export const getMotionType = (
  types: Map<string, string>,
  evmScriptFactory: string,
) => {
  return types.get(evmScriptFactory.toLowerCase()) || "New ";
};

export const getMotionLink = (motionId: string) => {
  return `[${motionId}](https://easytrack.lido.fi/motions/${motionId})`;
};

// this helper placed here because it's used in handling easy track motion events
export const buildStonksTopUpDescription = async (
  args: any,
): Promise<string> => {
  const topUpContract = new ethers.Contract(
    args._evmScriptFactory,
    TOP_UP_ALLOWED_RECIPIENTS_ABI,
    ethersProvider,
  );
  const { recipients, amounts } = await topUpContract.decodeEVMScriptCallData(
    args._evmScriptCallData,
  );
  const descriptions = recipients.map((recipient: string, idx: number) => {
    const stonksData = getStonksContractInfo(recipient);
    const amount = ethers.utils.formatUnits(amounts[idx]);
    const etherScanAddress = `[${stonksData?.from} -> ${stonksData?.to}](https://etherscan.io/address/${recipient})`;
    return `${etherScanAddress} pair with ${amount} stETH`;
  });
  return `Top up STONKS:\n ${descriptions.join("\n")}`;
};

const getStonksContractInfo = (address: string) => {
  return STONKS.find((c) => c.address === address);
};
