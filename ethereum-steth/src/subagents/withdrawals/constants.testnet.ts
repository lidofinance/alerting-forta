import { WITHDRAWALS_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";
import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  WITHDRAWALS_QUEUE_ADDRESS as wqAddress,
} from "../..//common/constants.testnet";

export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const LIDO_STETH_ADDRESS = lidoStethAddress;

export const WITHDRAWALS_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: WITHDRAWAL_QUEUE_ADDRESS,
  }),
);
