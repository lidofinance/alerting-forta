import { TRP_EVENTS_OF_NOTICE as trpEvents } from "./constants";

import { TRP_FACTORY_ADDRESS as trpFactoryAddress } from "../../common/constants.testnet";

export const TRP_FACTORY_ADDRESS = trpFactoryAddress;

export const TRP_EVENTS_OF_NOTICE = trpEvents.map((event) => ({
  ...event,
  address: TRP_FACTORY_ADDRESS,
}));
