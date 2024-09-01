import { handleCreateObolLidoSplitEvent } from "./agent-splitter-wrapper";
import { ARAGON_AGENT_ADDRESS } from "./constants";

const splitWalletContract = {
  filters: {
    CreateSplit: jest.fn(),
  },
  queryFilter: jest.fn(),
} as any;

const createSplitWalletIface = {
  decodeFunctionData: jest.fn(),
} as any;

describe("handleCreateObolLidoSplitEvent", () => {
  const splitWalletAddress = "0x123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return null when all conditions are met", async () => {
    const createdSplitMock = {
      getTransaction: jest.fn().mockResolvedValue({
        data: "0xdata",
      }),
    };
    splitWalletContract.filters.CreateSplit.mockReturnValue("filter");
    splitWalletContract.queryFilter.mockResolvedValue([createdSplitMock]);
    createSplitWalletIface.decodeFunctionData.mockReturnValue([
      ["0xacc1", "0xacc2"],
      [500000, 500000],
      0, // distributorFee === 0
      "0x00", // controller.isZero() === true
    ]);

    const result = await handleCreateObolLidoSplitEvent(
      splitWalletAddress,
      splitWalletContract,
      createSplitWalletIface,
    );

    expect(result).toBeNull();
  });

  it("should return splitWalletParams when total percent allocations is not 1e6", async () => {
    const createdSplitMock = {
      getTransaction: jest.fn().mockResolvedValue({
        data: "0xdata",
      }),
    };
    splitWalletContract.filters.CreateSplit.mockReturnValue("filter");
    splitWalletContract.queryFilter.mockResolvedValue([createdSplitMock]);
    createSplitWalletIface.decodeFunctionData.mockReturnValue([
      ["0xacc1", "0xacc2"],
      [400000, 500000],
      0,
      "0x00",
    ]);

    const result = await handleCreateObolLidoSplitEvent(
      splitWalletAddress,
      splitWalletContract,
      createSplitWalletIface,
    );

    expect(result).toEqual({
      accounts: ["0xacc1", "0xacc2"],
      percentAllocations: [400000, 500000],
      distributorFee: 0,
      controller: "0x00",
    });
  });

  it("should return splitWalletParams when distributorFee is not 0", async () => {
    const createdSplitMock = {
      getTransaction: jest.fn().mockResolvedValue({
        data: "0xdata",
      }),
    };
    splitWalletContract.filters.CreateSplit.mockReturnValue("filter");
    splitWalletContract.queryFilter.mockResolvedValue([createdSplitMock]);
    createSplitWalletIface.decodeFunctionData.mockReturnValue([
      ["0xacc1", "0xacc2"],
      [500000, 500000],
      100,
      "0x00",
    ]);

    const result = await handleCreateObolLidoSplitEvent(
      splitWalletAddress,
      splitWalletContract,
      createSplitWalletIface,
    );

    expect(result).toEqual({
      accounts: ["0xacc1", "0xacc2"],
      percentAllocations: [500000, 500000],
      distributorFee: 100,
      controller: "0x00",
    });
  });

  it("should return splitWalletParams when controller is not zero", async () => {
    const createdSplitMock = {
      getTransaction: jest.fn().mockResolvedValue({
        data: "0xdata",
      }),
    };
    splitWalletContract.filters.CreateSplit.mockReturnValue("filter");
    splitWalletContract.queryFilter.mockResolvedValue([createdSplitMock]);
    createSplitWalletIface.decodeFunctionData.mockReturnValue([
      ["0xacc1", "0xacc2"],
      [500000, 500000],
      0,
      "0x01",
    ]);

    const result = await handleCreateObolLidoSplitEvent(
      splitWalletAddress,
      splitWalletContract,
      createSplitWalletIface,
    );

    expect(result).toEqual({
      accounts: ["0xacc1", "0xacc2"],
      percentAllocations: [500000, 500000],
      distributorFee: 0,
      controller: "0x01",
    });
  });

  it("should return null when percentAllocations consists of 7 elements and is evenly distributed", async () => {
    const createdSplitMock = {
      getTransaction: jest.fn().mockResolvedValue({
        data: "0xdata",
      }),
    };

    splitWalletContract.filters.CreateSplit.mockReturnValue("filter");
    splitWalletContract.queryFilter.mockResolvedValue([createdSplitMock]);
    createSplitWalletIface.decodeFunctionData.mockReturnValue([
      ["0xacc1", "0xacc2", "0xacc3", "0xacc4", "0xacc5", "0xacc6", "0xacc7"],
      [142857, 142857, 142857, 142857, 142857, 142857, 142858],
      0, // distributorFee === 0
      "0x00", // controller.isZero() === true
    ]);

    const result = await handleCreateObolLidoSplitEvent(
      splitWalletAddress,
      splitWalletContract,
      createSplitWalletIface,
    );

    expect(result).toBeNull();
  });

  it("should return null when ARAGON_AGENT_ADDRESS has 250000 and the total is 1e6 with specific distribution", async () => {
    const createdSplitMock = {
      getTransaction: jest.fn().mockResolvedValue({
        data: "0xdata",
      }),
    };

    splitWalletContract.filters.CreateSplit.mockReturnValue("filter");
    splitWalletContract.queryFilter.mockResolvedValue([createdSplitMock]);
    createSplitWalletIface.decodeFunctionData.mockReturnValue([
      [
        "0xacc1",
        ARAGON_AGENT_ADDRESS,
        "0xacc3",
        "0xacc4",
        "0xacc5",
        "0xacc6",
        "0xacc7",
        "0xacc8",
      ],
      [107143, 250000, 107143, 107143, 107143, 107143, 107143, 107142],
      0, // distributorFee === 0
      "0x00", // controller.isZero() === true
    ]);

    const result = await handleCreateObolLidoSplitEvent(
      splitWalletAddress,
      splitWalletContract,
      createSplitWalletIface,
    );

    expect(result).toBeNull();
  });
});
