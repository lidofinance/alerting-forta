import { WITHDRAWALS_EVENTS_OF_NOTICE as mainnetEventsOfNotice } from "./constants";

export const WITHDRAWAL_QUEUE_ADDRESS =
  "0xcf117961421ca9e546cd7f50bc73abcdb3039533";
export const LIDO_ADDRESS = "0x1643e812ae58766192cf7d2cf9567df2c37e9b7f";

export const WITHDRAWALS_EVENTS_OF_NOTICE = mainnetEventsOfNotice.map(
  (event) => ({
    ...event,
    address: WITHDRAWAL_QUEUE_ADDRESS,
  })
);
