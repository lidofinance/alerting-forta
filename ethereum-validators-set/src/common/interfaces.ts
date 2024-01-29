import { Finding, FindingSeverity, TransactionEvent } from "forta-agent";

export interface EventsOfNotice {
  event: string;
  alertId: string;
  name: string;
  description: (...args: any[]) => string;
  severity: FindingSeverity;
}

interface EventHandler {
  initialize(currentBlock: number): Promise<{ [key: string]: string }>;
  handleTransaction(
    txEvent: TransactionEvent,
    eventInfo: EventsOfNotice,
  ): Promise<Finding[]>;
}

interface SubagentHandler {
  registerEventHandler(eventHandler: EventHandler): Promise<void>;
}

export class NodeOperatorRegistryHandler implements SubagentHandler {
  registerEventHandler(eventHandler: EventHandler): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
