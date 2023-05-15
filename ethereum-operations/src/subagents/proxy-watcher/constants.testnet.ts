import { IProxyContractData } from "src/common/constants";
import {
  implementationFuncShortABI,
  ossifiableProxyImplABI,
} from "./constants";

export const LIDO_PROXY_CONTRACTS_DATA: Map<string, IProxyContractData> =
  new Map<string, IProxyContractData>([
    [
      "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F",
      {
        name: "Lido DAO and stETH",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320",
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
      "0xbc0B67b4553f4CF52a913DE9A6eD0057E2E758Db",
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
      "0x1eDf09b5023DC86737b59dE68a8130De878984f5",
      {
        name: "Lido Locator",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      "0xa3Dbd317E53D363176359E10948BA0b1c0A4c820",
      {
        name: "Staking Router",
        shortABI: ossifiableProxyImplABI,
      },
    ],
    [
      "0xCF117961421cA9e546cD7f50bC73abCdB3039533",
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
      "0x76f358A842defa0E179a8970767CFf668Fc134d6",
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
