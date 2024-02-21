import { Finding, TransactionEvent, ethers } from "forta-agent";

export interface ContractMethodOrEventHandler<ContractParams> {
  initialize(currentBlock: number): Promise<{ [key: string]: string }>;
  handleTransaction(
    txEvent: TransactionEvent,
    contract: ethers.Contract,
    additionalParams: ContractParams,
  ): Promise<Finding[]>;
}

export abstract class BaseContractHandler<ContractParams> {
  protected readonly eventHandlers: ContractMethodOrEventHandler<ContractParams>[] =
    [];

  constructor(
    protected readonly contract: ethers.Contract,
    protected readonly contractParams: ContractParams,
  ) {}

  abstract initialize(currentBlock: number): Promise<{ [key: string]: string }>;

  public addEventHandler(
    eventHandler: ContractMethodOrEventHandler<ContractParams>,
  ) {
    this.eventHandlers.push(eventHandler);
  }

  public async handleTransaction(
    txEvent: TransactionEvent,
  ): Promise<Finding[]> {
    if (!(this.contract.address in txEvent.addresses)) {
      return [];
    }

    const findings: Finding[][] = [];

    for (const eventHandler of this.eventHandlers) {
      findings.push(
        await eventHandler.handleTransaction(
          txEvent,
          this.contract,
          this.contractParams,
        ),
      );
    }

    return findings.flat();
  }
}

export class ContractGroupHandler<ContractParams> {
  constructor(
    public readonly groupName: string,
    public readonly contractHandlers: BaseContractHandler<ContractParams>[] = [],
  ) {}

  public async initialize(
    currentBlock: number,
  ): Promise<{ [key: string]: string }> {
    console.log(`[${this.groupName}]`);

    for (const contractHandler of this.contractHandlers) {
      await contractHandler.initialize(currentBlock);
    }

    return {};
  }

  public async handleTransaction(
    txEvent: TransactionEvent,
  ): Promise<Finding[]> {
    const findings: Finding[][] = [];

    for (const contractHandler of this.contractHandlers) {
      findings.push(await contractHandler.handleTransaction(txEvent));
    }

    return findings.flat();
  }
}
