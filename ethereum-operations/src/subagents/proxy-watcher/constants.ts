import { IProxyContractData } from "../../common/constants";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  LIDO_LOCATOR_ADDRESS as lidoLocatorAddress,
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  STAKING_ROUTER_ADDRESS as srAddress,
  LIDO_ARAGON_VOTING_ADDRESS as votingAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
} from "../../common/constants";

export const implementationFuncShortABI =
  '[{"constant":true,"inputs":[],"name":"implementation","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]';

export const ossifiableProxyImplABI =
  '[{"inputs":[],"name":"proxy__getImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]';

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
      "0x442af784A788A5bd6F42A01Ebe9F287a871243fb",
      {
        name: "Legacy Oracle",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f",
      {
        name: "Withdrawals Manager Stub",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xb8FFC3Cd6e7Cf5a098A1c92F48009765B24088Dc",
      {
        name: "Lido Deployer 2",
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
      "0xf73a1260d222f447210581DDf212D915c09a3249",
      {
        name: "Aragon Token Manager",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xB9E5CBB9CA5b0d659238807E84D0176930753d86",
      {
        name: "Aragon Finance",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c",
      {
        name: "Lido Treasury",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x9895F0F17cc1d1891b6f18ee0b483B6f221b37Bb",
      {
        name: "Aragon ACL",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xF9339DE629973c60c4d2b76749c81E6F40960E3A",
      {
        name: "Lido Oracle Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xF5Dc67E54FC96F993CD06073f71ca732C1E654B1",
      {
        name: "Lido App Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x0D97E876ad14DB2b183CFeEB8aa1A5C788eB1831",
      {
        name: "Node Operators Registry Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x4Ee3118E3858E8D7164A634825BfE0F73d99C792",
      {
        name: "Voting Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xAb55Bf4DfBf469ebfe082b7872557D1F87692Fe6",
      {
        name: "Lido stETH Price Feed",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xA2F987A546D4CD1c607Ee8141276876C26b72Bdf",
      {
        name: "Anchor Protocol: AnchorVault",
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
      "0xb9d7934878b5fb9610b3fe8a5e441e8fad7e293f",
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
      "0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e",
      {
        name: "Validator Exit Bus Oracle",
        shortABI: ossifiableProxyImplABI,
      },
    ],
  ]);
