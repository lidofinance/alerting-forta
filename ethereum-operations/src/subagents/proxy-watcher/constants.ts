import { IProxyContractData } from "../../common/constants";

export const implementationFuncShortABI =
  '[{"constant":true,"inputs":[],"name":"implementation","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]';

export const LIDO_PROXY_CONTRACTS_DATA: Map<string, IProxyContractData> =
  new Map<string, IProxyContractData>([
    [
      "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      {
        name: "Lido DAO and stETH",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5",
      {
        name: "Lido: Node Operators Registry",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5",
      {
        name: "Lido: Oracle",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f",
      {
        name: "Lido: Withdrawals Manager Stub",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xb8FFC3Cd6e7Cf5a098A1c92F48009765B24088Dc",
      {
        name: "Lido: Deployer 2",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x2e59A20f205bB85a89C53f1936454680651E618e",
      {
        name: "Lido: Aragon Voting",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xf73a1260d222f447210581DDf212D915c09a3249",
      {
        name: "Lido: Aragon Token Manager",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xB9E5CBB9CA5b0d659238807E84D0176930753d86",
      {
        name: "Lido: Aragon Finance",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c",
      {
        name: "Lido: Treasury",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x9895F0F17cc1d1891b6f18ee0b483B6f221b37Bb",
      {
        name: "Lido: Aragon ACL",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xF9339DE629973c60c4d2b76749c81E6F40960E3A",
      {
        name: "Lido: Lido Oracle Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xF5Dc67E54FC96F993CD06073f71ca732C1E654B1",
      {
        name: "Lido: Lido App Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x0D97E876ad14DB2b183CFeEB8aa1A5C788eB1831",
      {
        name: "Lido: Node Operators Registry Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x4Ee3118E3858E8D7164A634825BfE0F73d99C792",
      {
        name: "Lido: Voting Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xAb55Bf4DfBf469ebfe082b7872557D1F87692Fe6",
      {
        name: "Lido: stETH Price Feed",
        shortABI:
          '[{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]',
      },
    ],
    [
      "0xA2F987A546D4CD1c607Ee8141276876C26b72Bdf",
      {
        name: "Anchor Protocol: AnchorVault",
        shortABI:
          '[{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]',
      },
    ],
  ]);
