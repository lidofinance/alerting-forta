import { IProxyContractData } from "src/common/constants";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  LIDO_ARAGON_VOTING_ADDRESS as votingAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
} from "../../common/constants.testnet";
import {
  implementationFuncShortABI,
  ossifiableProxyImplABI,
} from "./constants";

export const LIDO_PROXY_CONTRACTS_DATA: Map<string, IProxyContractData> =
  new Map<string, IProxyContractData>([
    [
      lidoStethAddress,
      {
        name: "Lido DAO and stETH",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      norAddress,
      {
        name: "Node Operators Registry",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x24d8451BC07e7aF4Ba94F69aCDD9ad3c6579D9FB",
      {
        name: "Legacy Oracle",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      votingAddress,
      {
        name: "Aragon Voting",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xDfe76d11b365f5e0023343A367f0b311701B3bc1",
      {
        name: "Aragon Token Manager",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x75c7b1D23f1cad7Fb4D60281d7069E46440BC179",
      {
        name: "Aragon Finance",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x4333218072D5d7008546737786663c38B4D561A4",
      {
        name: "Lido Treasury",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xb3CF58412a00282934D3C3E73F49347567516E98",
      {
        name: "Aragon ACL",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x9234e37Adeb44022A078557D9943b72AB89bF36a",
      {
        name: "Lido Oracle Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xE9eDe497d2417fd980D8B5338232666641B9B9aC",
      {
        name: "Lido App Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x5F867429616b380f1Ca7a7283Ff18C53a0033073",
      {
        name: "Node Operators Registry Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x14de4f901cE0B81F4EfcA594ad7b70935C276806",
      {
        name: "Voting Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      lidoLocatorAddress,
      {
        name: "Lido Locator",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      srAddress,
      {
        name: "Staking Router",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      wqAddress,
      {
        name: "Withdrawal Queue",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      "0xdc62f9e8C34be08501Cdef4EBDE0a280f576D762",
      {
        name: "Withdrawal Vault",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      accountingOracleAddress,
      {
        name: "Accounting Oracle",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      "0xb75A55EFab5A8f5224Ae93B34B25741EDd3da98b",
      {
        name: "Validator Exit Bus Oracle",
        shortABI: ossifiableProxyImplABI,
      },
    ],
  ]);
