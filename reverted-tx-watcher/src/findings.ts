import {
    Finding,
    FindingSeverity,
    FindingType,
    TransactionEvent,
  } from "forta-agent";
import {
    etherscanAddress,
    etherscanLink,
    gasUsed
} from "./agent-reverted-tx"
  
  export const createInfoSeverityFinding = (
    name: string,
    address: string,
    txEvent: TransactionEvent,
  ): Finding => {
    const fromSelf = address.toLowerCase() === txEvent.from.toLowerCase();
    return Finding.fromObject({
        name: "🤔 Reverted TX detected",
        description:
          `Reverted TX ${fromSelf ? "from" : "to"} the ${name} ${etherscanAddress(address)} contract. `
           + etherscanLink(txEvent.transaction.hash),
        alertId: "REVERTED-TX",
        severity: FindingSeverity.Info,
        type: FindingType.Suspicious,
        metadata: {
          sender: txEvent.from,
          contract: address,
          gas: gasUsed.toString(),
        },
      })
    };

  export const createLowSeverityFinding = (
    name: string,
    address: string,
    txEvent: TransactionEvent,
  ): Finding => {
    const fromSelf = address.toLowerCase() === txEvent.from.toLowerCase();
    return Finding.fromObject({
        name: "Reverted TX with high gas",
        description:
          `Reverted TX ${fromSelf ? "from" : "to"} the ${name} ${etherscanAddress(address)} contract with high gas used. `
           + etherscanLink(txEvent.transaction.hash),
        alertId: "REVERTED-TX",
        severity: FindingSeverity.Low,
        type: FindingType.Suspicious,
        metadata: {
          sender: txEvent.from,
          contract: address,
          gas: gasUsed.toString(),
        },
      })
    };

  export const createMediumSeverityFinding = (
    name: string,
    address: string,
    txEvent: TransactionEvent,
    number: number
  ): Finding => {
    const fromSelf = address.toLowerCase() === txEvent.from.toLowerCase();
    return Finding.fromObject({
        name: `${number} reverted TXs by one EOA`,
        description:
          `Reverted TX ${fromSelf ? "from" : "to"} the ${name} ${etherscanAddress(address)} contract by ${txEvent.from}. `
           + etherscanLink(txEvent.transaction.hash),
        alertId: "REVERTED-TX",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
        metadata: {
          sender: txEvent.from,
          contract: address,
          gas: gasUsed.toString(),
        },
      })
    };