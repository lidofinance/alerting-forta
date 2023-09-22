import BigNumber from "bignumber.js";
import { LogDescription } from "forta-agent";
import { abbreviateNumber } from "../../common/utils";

// INTERFACES and CLASSES
export interface SpecialTransferPattern {
  contract?: string;
  from?: string;
  to?: string;
  description: any;
}

export interface TransferPattern {
  contract?: string;
  from?: string;
  to?: string;
}

export interface ComplexTransferPattern {
  transferPatterns: {
    mainTransfer: TransferPattern;
    additionalTransfers: TransferPattern[];
  };
  description: any;
  omit?: boolean;
}

// Made for TS capability. Actual structure is
// {
//   timestamp: string;
//   from: string;
//   fromName: string;
//   to: string;
//   toName: string;
//   amount: string;
//   token: string;
//   comment: string;
//   link: string;
// }
export interface TransferEventMetadata {
  [key: string]: string;
}

export class TransferEventInfo {
  token: string;
  tokenName: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: BigNumber;
  amountPretty: string;
  logIndex: number;

  constructor(event: LogDescription) {
    this.from = event.args._from.toLowerCase();
    this.fromName = ADDRESS_TO_NAME.get(this.from) || "unknown";
    this.to = event.args._to.toLowerCase();
    this.toName = ADDRESS_TO_NAME.get(this.to) || "unknown";
    this.token = event.address.toLowerCase();
    this.tokenName =
      MONITORED_TOKENS.get(this.token) ||
      PARTIALLY_MONITORED_TOKENS.get(this.token) ||
      "unknown";
    this.amount = new BigNumber(String(event.args._value)).div(ETH_DECIMALS);
    this.amountPretty = abbreviateNumber(this.amount.toNumber());
    this.logIndex = event.logIndex;
  }
}

export interface TransferText {
  text: string;
  logIndex: number;
}

// COMMON CONSTS
export const ETH_DECIMALS = new BigNumber(10 ** 18);

export const TX_AMOUNT_THRESHOLD = 10000;
export const TX_AMOUNT_THRESHOLD_LDO = 5000000; // 5 000 000 LDO

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

// ADDRESSES
export const LDO_TOKEN_ADDRESS = "0x5a98fcbea516cf06857215779fd812ca3bef1b32";
export const STETH_TOKEN_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const WSTETH_TOKEN_ADDRESS =
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

export const AAVE_V2_VAULT_ADDRESS =
  "0x1982b2f5814301d4e9a8b0201555376e62f82428";
export const AAVE_V3_VAULT_ADDRESS =
  "0x0B925eD163218f6662a35e0f0371Ac234f9E9371";
export const WSTETH_A_VAULT_ADDRESS =
  "0x10cd5fbe1b404b7e19ef964b63939907bdaf42e2";
export const WSTETH_B_VAULT_ADDRESS =
  "0x248cCBf4864221fC0E840F29BB042ad5bFC89B5c";
export const CURVE_POOL_ADDRESS = "0xdc24316b9ae028f1497c275eb9192a3ea0f67022";

export const IGNORE_LIST = [
  "0xd15a672319cf0352560ee76d9e89eab0889046d3", // Burner
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // Lido
];

export const MONITORED_TOKENS = new Map<string, string>(
  [
    [STETH_TOKEN_ADDRESS, "stETH"],
    [WSTETH_TOKEN_ADDRESS, "wstETH"],
    ["0x707f9118e33a9b8998bea41dd0d46f38bb963fc8", "bETH"],
    ["0x06325440d014e39736583c165c2963ba99faf14e", "steCRV"],
    ["0x182b723a58739a9c974cfdb385ceadb237453c28", "steCRV_gauge"],
    ["0x1982b2f5814301d4e9a8b0201555376e62f82428", "astETH"],
    ["0xc383a3833a87009fd9597f8184979af5edfad019", "ies"],
    ["0x1f629794b34ffb3b29ff206be5478a52678b47ae", "oneInch_lp"],
    ["0x53773e034d9784153471813dacaff53dbbb78e8c", "rstETH_theta"],
    ["0x4e079dca26a4fe2586928c1319b20b1bf9f9be72", "rstETH_theta_gauge"],
    ["0x447ddd4960d9fdbf6af9a790560d0af76795cb08", "rETH_wstETH"],
    ["0x8ad7e0e6edc61bc48ca0dd07f9021c249044ed30", "rETH_wstETH_f_gauge"],
    ["0xc5578194d457dcce3f272538d1ad52c68d1ce849", "slp"],
    ["0x7259ee19d6b5e755e7c65cecfd2466c09e251185", "fwstETH_8"],
    ["0xc27bfe32e0a934a12681c1b35acf0dba0e7460ba", "fsteCRV"],
    ["0xbc10c4f7b9fe0b305e8639b04c536633a3db7065", "sdsteCRV"],
    ["0x7c07f7abe10ce8e33dc6c5ad68fe033085256a84", "icETH"],
    ["0x0fe20e0fa9c78278702b05c333cc000034bb69e2", "ETHmaxy"],
    //["0x439cac149b935ae1d726569800972e1669d17094", "IDOL"],
    ["0x4028daac072e492d34a3afdbef0ba7e35d8b55c4", "uni_v2_stETH_2"],
    ["0xbfd291da8a403daaf7e5e9dc1ec0aceacd4848b9", "iwstETH"],
    ["0x49da42a1eca4ac6ca0c6943d9e5dc64e4641e0e3", "fwstETH_146"],
    ["0x48143538590587df4de00a77c2dd52f689088335", "enzf"],
    ["0x8acdb3bcc5101b1ba8a5070f003a77a2da376fe8", "farm_1lp_ldo"],
    ["0x1bcce9e2fd56e8311508764519d28e6ec22d4a47", "uni_v2_USDC_STABLEx"],
    ["0x3252efd4ea2d6c78091a1f43982ee2c3659cc3d1", "stablex3crv_f_ARCx"],
    ["0x6c0ffb49ad9072f253e254445cfd829bcb8a1b5d", "stablex3crv_f"],
    ["0xec18ffea29dacc0f47525529fd1fd1d4a40fe65c", "istablex"],
    ["0xbd1bd5c956684f7eb79da40f582cbe1373a1d593", "ewstETH"],
    ["0x436548baab5ec4d79f669d1b9506d67e98927af7", "dwstETH"],
    [LDO_TOKEN_ADDRESS, "LDO"],
    ["0x828b154032950c8ff7cf8085d841723db2696056", "STETHETH_C-f"],
    ["0x32296969ef14eb0c6d29669c550d4a0449130230", "B-stETH-STABLE"],
    ["0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae", "B-stETH-STABLE-gauge"],
    ["0x5faf6a2d186448dfa667c51cb3d695c7a6e52d8e", "yvCurve-stETH-WETH"],
    ["0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0", "STETHETH_C-f-gauge"],
    ["0xdcd90c7f6324cfa40d7169ef80b12031770b4325", "yvCurve-stETH"],
    ["0x9518c9063eb0262d791f38d8d6eb0aca33c63ed0", "cvxsteCRV"],
    ["0x0b925ed163218f6662a35e0f0371ac234f9e9371", "Aave: Ethereum wstETH V3"],
    [
      "0xc96113eed8cab59cd8a66813bcb0ceb29f06d2e4",
      "Aave Ethereum Variable Debt wstETH",
    ],
    ["0x12b54025c112aa61face2cdb7118740875a566e9", "Spark wstETH (spwstETH)"],
  ].map((pair: string[]) => [pair[0].toLowerCase(), pair[1]]),
);

export const PARTIALLY_MONITORED_TOKENS = new Map<string, string>(
  [["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "WETH"]].map(
    (pair: string[]) => [pair[0].toLowerCase(), pair[1]],
  ),
);

export const ADDRESS_TO_NAME = new Map<string, string>(
  [
    [STETH_TOKEN_ADDRESS, "stETH"],
    [WSTETH_TOKEN_ADDRESS, "wstETH"],
    ["0x707f9118e33a9b8998bea41dd0d46f38bb963fc8", "bETH"],
    ["0x06325440d014e39736583c165c2963ba99faf14e", "steCRV"],
    ["0x182b723a58739a9c974cfdb385ceadb237453c28", "steCRV_gauge"],
    ["0xc27bfe32e0a934a12681c1b35acf0dba0e7460ba", "fsteCRV"],
    ["0xbd1bd5c956684f7eb79da40f582cbe1373a1d593", "ewstETH"],
    ["0x436548baab5ec4d79f669d1b9506d67e98927af7", "dwstETH"],
    [LDO_TOKEN_ADDRESS, "LDO"],
    ["0x828b154032950c8ff7cf8085d841723db2696056", "STETHETH_C-f"],
    ["0x32296969ef14eb0c6d29669c550d4a0449130230", "B-stETH-STABLE"],
    ["0xdcd90c7f6324cfa40d7169ef80b12031770b4325", "yvCurve-stETH"],
    ["0xdc24316b9ae028f1497c275eb9192a3ea0f67022", "Curve.fi"],
    ["0x1982b2f5814301d4e9a8b0201555376e62f82428", "AAVE_v2"],
    ["0xa2f987a546d4cd1c607ee8141276876c26b72bdf", "Anchor"],
    ["0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", "Lido"],
    ["0xac38ee05c0204a1e119c625d0a560d6731478880", "Fei Protocol"],
    ["0xb671e841a8e6db528358ed385983892552ef422f", "Gnosis safe"],
    ["0x0967afe627c732d152e3dfcadd6f9dbfecde18c3", "Yearn"],
    ["0xcafea35ce5a2fc4ced4464da4349f81a122fd12b", "Nexus Mutual"],
    ["0x75a03ec24bf95f68a749d833a2efde50db7a6192", "Gnosis safe"],
    ["0xfdd86a96f47015d9c457c841e1d52d06ede16a92", "Gnosis safe"],
    ["0x11986f428b22c011082820825ca29b21a3c11295", "Gnosis safe"],
    ["0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2", "FTX"],
    ["0x330e726f37061fbbdab99d46ab9a5a5171529c3c", "Gnosis multisig"],
    ["0xac665a44d46194eb9826d6f93fb5cc93bc2654b4", "Gnosis safe"],
    ["0x0bc3807ec262cb779b38d65b38158acc3bfede10", "nouns dao,treasury"],
    ["0x0632dcc37b1fabf2cad20538a5390d23c830962e", "Gnosis safe"],
    ["0x46e4f1ec613faa131722fe26234b892f0a7e81fc", "Gnosis safe"],
    ["0x3e40d73eb977dc6a537af587d48316fee66e9c8c", "aragon??"],
    ["0x4debdd6cee25b2f931d2fe265d70e1a533b02453", "Gnosis safe"],
    ["0x3f3a4f13a0c1390d018e75032f9e12dbe2b27412", "Agent"],
    ["0x439cac149b935ae1d726569800972e1669d17094", "IDOLS_NFT"],
    ["0x34dcd573c5de4672c8248cd12a99f875ca112ad8", "IDLE"],
    ["0x27c115f0d823973743a5046139806adce5e9cfd5", "Agent"],
    ["0x45c409f21f337f96ad6cccc5d6dab22464529105", "Agent"],
    ["0x789268fa8b0704aff44ace685703ad81759030b3", "Gnosis safe"],
    ["0x4039e1c58b27298d92e69d5bf215378e4f8544a5", "Gnosis safe"],
    ["0x7eaafd601977d0f1aae82e05461d23c0701bb6a5", "Gnosis safe"],
    ["0xc383a3833a87009fd9597f8184979af5edfad019", "Instadapp"],
    ["0x1738f6ac9f8b97481ac060557918783d4d0c1e34", "Agent"],
    ["0x798576f0b501a8eb61d914249676e3878584b2ee", "Gnosis safe"],
    ["0x4afe1df6cc422b2da695a69da888c685704a975d", "Gnosis safe"],
    ["0xe094a22330b1eb7d69bb6342a63c59c07c1a5b4c", "Gnosis safe"],
    ["0x0cf9652b7f00b4032e8ea4627cdf792cc37c72d7", "Gnosis safe"],
    ["0x1a4d6827cf83d3db1f43cd2e833842db71027225", "Gnosis safe"],
    ["0x8fc606cdddcd0dd40c92034ec1ecc2012e49bc78", "Gnosis safe"],
    ["0x1bd9f918e38239e8454ee647e552862ec8e6f57d", "Agent"],
    ["0x07a04253e22b919f0d540fa505bcd9fcc0ee6d20", "Gnosis safe"],
    ["0xab4c505e70b9abed3527911b42d72611a604abb5", "Gnosis safe"],
    ["0xf825f87546424656444506bdde3ae5554e4be933", "Gnosis safe"],
    ["0x8ef11fa9d66b1ad1c75a2d1b746358c3780e34f3", "Gnosis safe"],
    ["0x0697b0a2cbb1f947f51a9845b715e9eab3f89b4f", "tempus"],
    ["0xdf6750ecdb74c0cc548d6536f4ec5d67e0376ed3", "Agent"],
    ["0x00e286b5256aa6cf252d5a8a5a7b8c20ec3bc4d5", "Gnosis safe"],
    ["0xe56b4d8d42b1c9ea7dda8a6950e3699755943de7", "necdao"],
    ["0x78e3984e1ab1c3eb560cbd5b42b635e1cd341bc2", "Gnosis safe"],
    ["0x519b70055af55a007110b4ff99b0ea33071c720a", "dxdao"],
    ["0x3a24fea1509e1baeb2d2a7c819a191aa441825ea", "Gnosis safe"],
    ["0x1de591da043aa0b220f1dc6f05efd3df1d47bc52", "Gnosis safe"],
    ["0x3b640748d96c6ec3e0148d41a25a311042e5cd73", "Gnosis safe"],
    ["0x1de8f9874a5b60c94304888f8b42db21f06813e6", "Gnosis safe"],
    ["0xa2e3a2ca689c00f08f34b62ccc73b1477ef1f658", "Gnosis safe"],
    ["0x70a613ea53b71abcbd9b32eafb86362a31d5164c", "Gnosis safe"],
    ["0xd498fb8d9da6fcd64f9c0dd27e0b22c84eaa02f1", "Gnosis safe"],
    ["0x7a75e85d6d3f0b6d7363a5d7f23adc25101131e7", "Gnosis safe"],
    ["0x9b33dd59fa401374f9213d591d0319a9d7e9d2cb", "Gnosis safe"],
    ["0x35bbdc3fbdc26f7dfee5670af50b93c7eabce2c0", "cofix_v2_1"],
    ["0xf912cfcab7f1cf82b431edb309d681a2a1ba2a22", "Gnosis safe"],
    ["0xa6347afc86abf77bb4c79ef56deb7cf2892566f3", "Gnosis safe"],
    ["0x675bc420577318b709f8e2c0f3599d547c44ea34", "Gnosis safe"],
    ["0xc7a1fcde0b80c89b9b270cf9c87e9c6753f30d0b", "Gnosis safe"],
    ["0x1f629794b34ffb3b29ff206be5478a52678b47ae", "1inch liquidity pool"],
    ["0xf938a9ed2fc7e4e03216ca210d8750506d743b5c", "Agent"],
    ["0x48f300bd3c52c7da6aabde4b683deb27d38b9abb", "Gnosis safe"],
    ["0x63c1cfbbc2b5f1d54636520b9ef484afc3b1f912", "Gnosis safe"],
    ["0xebc498895382ddcbd247b2945ba116157d361134", "Agent"],
    ["0x4028daac072e492d34a3afdbef0ba7e35d8b55c4", "Uniswap_v2"],
    ["0x7ad2c85e3092a3876a0b4b345df8c72fc6c9636f", "Agent"],
    ["0x1390047a78a029383d0adcc1adb5053b8fa3243f", "Gnosis safe"],
    ["0x60cf9d61370d44ccf55289aebea33a072d9f93bd", "Gnosis safe"],
    ["0xf5307a74d1550739ef81c6488dc5c7a6a53e5ac2", "Gnosis safe"],
    ["0x7cf4cc19d9149763d8575d7c81f89049a2c67bc8", "Gnosis safe"],
    ["0xaaf024c4299a85461f39bd4f6f74b99427f9c0c3", "Gnosis safe"],
    ["0x547147fd4f69bae198574b17b023d3a68a5fcfb8", "Agent"],
    ["0x33a2b3fe75d76f85d8ec9b77042be9b29b3fb8d0", "Gnosis safe"],
    ["0x963c94e660acc8fb3d4314b95003450426b903da", "Gnosis safe"],
    ["0xe97dc81245e7558aaab12aa54567676559fda783", "Gnosis safe"],
    ["0x9bcefc2c9f19e30b68343858cdbc1e27ea62e1fb", "Gnosis safe"],
    ["0xc393fa98109b91fb8c5043d36abaad061e68a4f2", "Gnosis safe"],
    ["0xbb5992b77c30f69171b86ab83029de2ea0134af4", "Gnosis safe"],
    ["0xace04952131a6c0f5c5a85df5925f832678e1059", "Gnosis safe"],
    ["0xfb47b2ca7df248d36cf0e4f63bfd0503c25debd4", "Gnosis safe"],
    ["0xb6804dac8541c585f029f0bbddd6fe1bb2f4b51a", "Agent"],
    ["0x24a1227536753559c0245de29e3673d7836c5f5b", "Agent"],
    ["0x25a6c38ce0646fcc9139374d2598924bd47012e9", "Agent"],
    ["0xc20c82773a464a4a5f6c91625d121f0b93078071", "Gnosis safe"],
    ["0x2b2526c6f158dcb294d6854f824dfa83ea366cf9", "Gnosis safe"],
    ["0x5b1c657d0d0fc05e86142a19f92003e87b86bbee", "Gnosis safe"],
    ["0x1299461a6dc8e755f7299cc221b29776d7edb663", "Gnosis safe"],
    ["0xee11740d863289e813d3cbe5bae6a9346a64480c", "Gnosis safe"],
    ["0xa978d807614c3bfb0f90bc282019b2898c617880", "inverse finance"],
    ["0x8821c46cc0ab31cab33824b2b31a361109dd086f", "Gnosis safe"],
    ["0xfa61d61db727573c9bd8e447122b2350ccef9d61", "enzyme protocol"],
    ["0x36449abf12e227fcbb240589457418a1a57978bf", "Agent"],
    ["0x3e0433cde2c58f5c07d22ed506e72ae8c7a97b34", "Agent"],
    ["0xe0fdc90022d9c6e4c4e7ebd16b40a439b210adcd", "Agent"],
    ["0x5391d7943282a8d537bacc8973649440178acdac", "Agent"],
    ["0x6215daea5b3e266f841fad9b2566c5d00a6d2dcc", "Gnosis safe"],
    ["0x96698bc70f11bb14544802346edee4477d6606e5", "Agent"],
    ["0x8a0e4afa935d795d5c537e4614976d1acbd4faa8", "Gnosis safe"],
    ["0x27756755dc1b50e85f0ae250a5052283e1c76902", "Gnosis safe"],
    ["0x13bd738dabd43b667fa206d4cb201de857c1c495", "Agent"],
    ["0x5181d5d56af4f823b96fe05f062d7a09761a5a53", "Gnosis safe"],
    [WSTETH_A_VAULT_ADDRESS, "Makerdao wstETH-A"],
    [WSTETH_B_VAULT_ADDRESS, "Makerdao wstETH-B"],
    ["0xba12222222228d8ba445958a75a0704d566bf2c8", "Balancer_v2"],
    ["0x5934807cc0654d46755ebd2848840b616256c6ef", "opynfinance_v2"],
    ["0x34dcd573c5de4672c8248cd12a99f875ca112ad8", "idle"],
    ["0x447ddd4960d9fdbf6af9a790560d0af76795cb08", "Curve.fi"],
    ["0x2050cc4e48ec7cd8ad94561a3b2df1d187ab9e3d", "Gnosis safe"],
    ["0x3ee18b2214aff97000d974cf647e7c347e8fa585", "wormhole"],
    ["0xc5578194d457dcce3f272538d1ad52c68d1ce849", "Sushi"],
    ["0xbfd291da8a403daaf7e5e9dc1ec0aceacd4848b9", "dforce"],
    ["0x8ce9df09496999016a3620b9c992706d7b0b345e", "Gnosis safe"],
    ["0xabea9132b05a70803a4e85094fd0e1800777fbef", "zkSync"],
    ["0x22925707d59f89c2edf103b79436fce932d559eb", "Gnosis safe"],
    ["0x27c115f0d823973743a5046139806adce5e9cfd5", "Agent"],
    ["0x062bf725dc4cdf947aa79ca2aaccd4f385b13b5c", "alchemix_v2"],
    ["0x7259ee19d6b5e755e7c65cecfd2466c09e251185", "rari_capital"],
    ["0x49da42a1eca4ac6ca0c6943d9e5dc64e4641e0e3", "rari_capital"],
    ["0xd340b57aacdd10f96fc1cf10e15921936f41e29c", "uni v3"],
    ["0x5d22045daceab03b158031ecb7d9d06fad24609b", "deversifi"],
    ["0x5364d336c2d2391717bd366b29b6f351842d7f82", "yield-protocol"],
    [
      "0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f",
      "Balancer: dao multisig (Gnosis safe)",
    ],
    [
      "0xdaeada3d210d2f45874724beea03c7d4bbd41674",
      "Ribbon finance: multisig (Gnosis safe)",
    ],
    ["0xce88686553686da562ce7cea497ce749da109f9f", "Balancer_v2"],
    ["0xcd91538b91b4ba7797d39a2f66e63810b50a33d0", "ARCx"],
    ["0x99ac10631f69c753ddb595d074422a0922d9056b", "stecrv deposit"],
    ["0xba12222222228d8ba445958a75a0704d566bf2c8", "Balancer_v2"],
    ["0xbc10c4f7b9fe0b305e8639b04c536633a3db7065", "Curve.fi"],
    ["0x7bb0f700983fadad5e28946f12c37e117145ad5c", "Gnosis safe"],
    ["0x989aeb4d175e16225e39e87d0d97a3360524ad80", "convex"],
    ["0x9d94ef33e7f8087117f85b3ff7b1d8f27e4053d5", "Gnosis safe"],
    ["0xe979438b331b28d3246f8444b74cab0f874b40e8", "Gnosis safe"],
    ["0x0f5cfb3a503b126b6bcd1adf5e3c6ab35a48a48b", "Gnosis safe"],
    ["0xc064c511db5982d35a5761577ce6b0ef1184487b", "Gnosis safe"],
    ["0x9817569dc3015c84846159dabcb80425186f506f", "Gnosis safe"],
    ["0x26d8bd22c1b3ce53d6c5110c71138749f4c69439", "Agent"],
    ["0x48143538590587df4de00a77c2dd52f689088335", "enzyme"],
    ["0x768ad67ba3f8c03d91618eecafe1593bd4e74aa6", "Agent"],
    ["0x94269a09c5fcbd5e88f9df13741997bc11735a9c", "Instadapp"],
    ["0xeaa7723633cf598e872d611f5ec50a45b65cbc72", "Gnosis safe"],
    ["0x7c07f7abe10ce8e33dc6c5ad68fe033085256a84", "indexcoop"],
    ["0xa976ea51b9ba3232706af125a92e32788dc08ddc", "Gnosis safe"],
    ["0x3cec1bd5427b36aaac6d96d9d562275994338021", "Maker"],
    ["0xe86e0249e7a6c93b3929eaa3034940ccd43de1c2", "Instadapp"],
    ["0x974012d9590ba6014b83c03a93c7b09706e0a469", "Instadapp"],
    ["0x3f9bd764829b68a2613e6cd99e8ef7b5d480c782", "Instadapp"],
    ["0x7446129e39fb87cd2064da041ad6df0a47e57fde", "Instadapp"],
    ["0xc9cea6df3a736846c5b610ff342836838ec1a84d", "Maker"],
    ["0xd1d116dc6597332427dde73a84d07abb2484fd3a", "Gnosis safe"],
    ["0x0fe20e0fa9c78278702b05c333cc000034bb69e2", "galleoncommunity"],
    ["0x188144e43fd41fbf0f3a0ad5ba14eb26ef750ec8", "Maker"],
    ["0x554ba143f8040258925af75b1149bea542457085", "Instadapp"],
    ["0x7fbcb6c7905f6a8af305b43c96585ccc94f6c90a", "Instadapp"],
    ["0x74ca8809ad8f80f971fafdd5b7ee7085f6819efc", "Instadapp"],
    ["0x849d52316331967b6ff1198e5e32a0eb168d039d", "Gnosis safe"],
    ["0xe6f4fe264a4ba1a01724f3f772b5b75aee697c44", "Instadapp"],
    ["0xf2863dc48f476830f709e6227b8f99d674622676", "Maker"],
    ["0x3bcf3db69897125aa61496fc8a8b55a5e3f245d5", "piedao"],
    ["0x905e8166024a9194be2e6b082b26d8498ca3d6a0", "Instadapp"],
    ["0xcdb238d68d8da74487711bc1f8f13f3d00667d1a", "Maker"],
    ["0x803416ae9f7f18ed8daedec9c6dfbd10d8d35d27", "Instadapp"],
    ["0x27c115f0d823973743a5046139806adce5e9cfd5", "Agent"],
    ["0xd2342aebf162b5852aadab82d6299fd5f57ad111", "Gnosis safe"],
    ["0x6cb8e427d1a469555d3796b279a525f0a57ca10c", "Instadapp"],
    ["0x763f74d0d1af1da55c77fa3e3b564eef2192d438", "Instadapp"],
    ["0x238b38233bc156bb8990876d4c503b6a3fbe6b73", "Maker"],
    ["0x9ca173d2e4b4246b8cc9d7ee331678e638c386b4", "Maker"],
    ["0xed2713c34770e0312a5c32c871b89aa2b03ae4d7", "Maker"],
    ["0x60ee8465dc43245c6c2989b1089e476d3a0a717d", "Instadapp"],
    ["0x438857166f250b92541b2695ff1d787a6850d2d3", "Maker"],
    ["0x09ad82f607e92d6429a0dc71e5a946f4e4cb15bd", "Maker"],
    ["0x6215daea5b3e266f841fad9b2566c5d00a6d2dcc", "Gnosis safe"],
    ["0x975cce223e689914b51efd3efec3e29d7d0fc7db", "Maker"],
    ["0xdfbbd131944eee7c2d29d1ce975f3dce99eae689", "Maker"],
    ["0x963c94e660acc8fb3d4314b95003450426b903da", "Gnosis safe"],
    ["0xb62d0656f4032cd26a68474bd776111b5dacfa3b", "Maker"],
    ["0xb7550ee0f463a0f141e1a4c4d08b2d6b8df39b3c", "Maker"],
    ["0xb3d8cca14f249cf68e5272c1e7623bfecc705591", "Instadapp"],
    ["0x7d790d3fca1232e6d7d7643cad2b27951e20378a", "Maker"],
    ["0xb4f716fb9013650431922f003f3f11118a428c2d", "Maker"],
    ["0x9bd916e8827e324cb05cead305da20a611304af1", "Maker"],
    ["0x2593c2806c67d0f86336f5d335612616f52477fc", "Gnosis safe"],
    ["0x310a2c115d3d45a89b59640fff859be0f54a08e2", "Maker"],
    ["0x9f4f18ac9cc9de7c1441ac39ab2dbd7174fa1561", "Gnosis safe"],
    ["0xb45b840f668baa1203daec7ab0450482d32e06b5", "Instadapp"],
    ["0xaac4d2293bb5d6701f4b739b234f1bf788726475", "Instadapp"],
    ["0xb6e29471e9929cd8cc551f3bf6c5ffde3ae7ab63", "Maker"],
    ["0x204a3385639260cb8dd945177ff8c534ce029ba8", "Maker"],
    ["0x371e12fd707d72f33aef7f0b61194a1b64a1c8d3", "Maker"],
    ["0xd3c79932541cebe473c783d4152532892323b044", "Instadapp"],
    ["0xd7cd13d8f86c7c580491b4cdadf849267475a965", "Maker"],
    ["0x48dee3cf41a3078575aa2c09633907244b8e7585", "Instadapp"],
    ["0xd8af19cec55374cf424f98effe9c40fd45128ad1", "Instadapp"],
    ["0x9b82ba5866b6086b8952982d17e924bc8ad6f1a0", "Maker"],
    ["0xac5dbb0297e45f39bca313e2e44a8e3f26508e1f", "Maker"],
    ["0x05388597f917831e5d7099413769b253ca3a0b2b", "Instadapp"],
    ["0x6db544e2a4464762c4df0876389c5357fa7a3a93", "Maker"],
    ["0xe17982932cfd373ad0351f42161a11f5fb5be990", "Maker"],
    ["0xea9f2e31ad16636f4e1af0012db569900401248a", "Gnosis safe"],
    ["0x81a342b55773db51e205e400202ff0eed88c94ee", "Maker"],
    ["0x05a782af9a50a194efdd44d01275d72d254fe0c1", "Gnosis safe"],
    ["0x74b3691ebc3fb083e36065a1986d6c490b13e95a", "Instadapp"],
    ["0x66a98cfcd5a0dcb4e578089e1d89134a3124f0b1", "Gnosis safe"],
    ["0x4e7e7fcf2e0d25e4a4f008d0184ef614f1803227", "Gnosis safe"],
    ["0x65736a137cd4629454bb0226704deec0aef5aded", "Gnosis safe"],
    ["0x8acdb3bcc5101b1ba8a5070f003a77a2da376fe8", "1inch"],
    ["0x4e079dca26a4fe2586928c1319b20b1bf9f9be72", "Ribbon"],
    ["0x53773e034d9784153471813dacaff53dbbb78e8c", "Ribbon"],
    ["0xd211a02a0adde56bb7f9700f49d4ba832adc7ddf", "Gnosis safe"],
    ["0x8ad7e0e6edc61bc48ca0dd07f9021c249044ed30", "Curve.fi"],
    ["0x989aeb4d175e16225e39e87d0d97a3360524ad80", "Curve.fi"],
    ["0xef0881ec094552b2e128cf945ef17a6752b4ec5d", "Sushi"],
    ["0x371889b65337a0992fd5a03494fff2d73359a8f6", "Gnosis safe"],
    ["0x1bcce9e2fd56e8311508764519d28e6ec22d4a47", "Uniswap_v2"],
    ["0x3252efd4ea2d6c78091a1f43982ee2c3659cc3d1", "ARCx"],
    ["0x6c0ffb49ad9072f253e254445cfd829bcb8a1b5d", "ARCx"],
    ["0xec18ffea29dacc0f47525529fd1fd1d4a40fe65c", "ARCx"],
    ["0x8f1155447ee97b5ae147a01a5c420b0fddf0370d", "ARCx"],
    ["0x3043b623632ff1ac88b3a17113e39c0b964381c5", "ARCx"],
    ["0xa85333da5e5a48498f0a65a1a6521e0ceadd3efd", "ARCx"],
    ["0x2e25800957742c52b4d69b65f9c67abc5ccbffe6", "harvest_finance"],
    ["0xfea5e213bbd81a8a94d0e1edb09dbd7ceab61e1c", "stakedao"],
    ["0xabea9132b05a70803a4e85094fd0e1800777fbef", "zkSync"],
    ["0xe5d028350093a743a9769e6fd7f5546eeddaa320", "Uniswap_v3"],
    ["0xfececebf44d38858a0c478c2c4afa2601f5352fb", "Uniswap_v3"],
    ["0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0", "Curve.fi"],
    ["0x5faf6a2d186448dfa667c51cb3d695c7a6e52d8e", "Curve.fi"],
    ["0x849d52316331967b6ff1198e5e32a0eb168d039d", "Gnosis safe"],
    ["0xaa162488147fe4ac566edd2be5453e98b8843425", "Gnosis safe"],
    ["0x7902d79ada34e3cb32a3faa5496334a004589925", "Gnosis safe"],
    ["0xe979438b331b28d3246f8444b74cab0f874b40e8", "Gnosis safe"],
    ["0x4039e1c58b27298d92e69d5bf215378e4f8544a5", "Gnosis safe"],
    ["0x7da4d992c94dcdfbb3c7dc3469be69bf6a04be7b", "Gnosis safe"],
    ["0x06205d856a7a990e1876e2f8f64140e97850989c", "Gnosis safe"],
    ["0x988a4c83b739cbcc24627bf91ed560f0c9afb08e", "Gnosis safe"],
    ["0xd96f48665a1410c0cd669a88898eca36b9fc2cce", "abracadabra"],
    ["0x3217b819ea2d25f1982bae5dd9c8fe4c6d546bfc", "Gnosis safe"],
    ["0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae", "Balancer"],
    ["0xc8d71178f0376e22eaf5c38a4cc460535c4e18b5", "Balancer"],
    ["0x9d94ef33e7f8087117f85b3ff7b1d8f27e4053d5", "Gnosis safe"],
    ["0xa976ea51b9ba3232706af125a92e32788dc08ddc", "Gnosis safe"],
    ["0x650f9607f1371a4b8f80d2949162aedb3a4a839e", "Gnosis safe"],
    ["0xaf52695e1bb01a16d33d7194c28c42b10e0dbec2", "Aura: Voter Proxy"],
    ["0x7818a1da7bd1e64c199029e86ba244a9798eee10", "Aura: Booster"],
  ].map((pair: string[]) => [pair[0].toLowerCase(), pair[1]]),
);

export const SIMPLE_TRANSFERS: SpecialTransferPattern[] = [
  {
    contract: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    from: "0x0000000000000000000000000000000000000000",
    to: "0x97de57eC338AB5d51557DA3434828C5DbFaDA371",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ETH**  ` +
      `was supplied to Lybra Finance and staked`,
  },
  {
    from: NULL_ADDRESS,
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were minted.\n` +
      `To: ${info.to} (${info.toName})`,
  },
  {
    to: NULL_ADDRESS,
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were burned.\n` +
      `From: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    to: WSTETH_A_VAULT_ADDRESS,
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Maker(wstETH-A)\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    from: WSTETH_A_VAULT_ADDRESS,
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Maker(wstETH-A)\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    to: "0x248ccbf4864221fc0e840f29bb042ad5bfc89b5c",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Maker(wstETH-B)\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    from: "0x248ccbf4864221fc0e840f29bb042ad5bfc89b5c",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Maker(wstETH-B)\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    to: "0x53773e034d9784153471813dacaff53dbbb78e8c",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Ribbon Vault\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    from: "0x53773e034d9784153471813dacaff53dbbb78e8c",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Ribbon Vault\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    from: "0x5934807cc0654d46755ebd2848840b616256c6ef",
    to: "0x53773e034d9784153471813dacaff53dbbb78e8c",
    description: (info: TransferEventInfo) =>
      `Ribbon's short position of ` +
      `**${info.amountPretty} ${info.tokenName}** ` +
      `was closed.\n`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    from: "0x53773e034d9784153471813dacaff53dbbb78e8c",
    to: "0x5934807cc0654d46755ebd2848840b616256c6ef",
    description: (info: TransferEventInfo) =>
      `Ribbon's short position of ` +
      `**${info.amountPretty} ${info.tokenName}** ` +
      `was opened.\n`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    to: "0xa17581a9e3356d9a858b789d68b4d866e593ae94",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Compound\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    from: "0xa17581a9e3356d9a858b789d68b4d866e593ae94",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Compound\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    contract: "0x06325440d014e39736583c165c2963ba99faf14e",
    to: "0x8377cd01a5834a6ead3b7efb482f678f2092b77e",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Maker(steCRV-A)\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0x06325440d014e39736583c165c2963ba99faf14e",
    from: "0x8377cd01a5834a6ead3b7efb482f678f2092b77e",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Maker(steCRV-A)\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    contract: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    to: "0x97de57eC338AB5d51557DA3434828C5DbFaDA371",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Lybra Finance\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    contract: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    from: "0x97de57eC338AB5d51557DA3434828C5DbFaDA371",
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `was withdrawn from Lybra Finance\n` +
      `by: ${info.to} (${info.toName})`,
  },
];

export const COMPLEX_TRANSFERS_TEMPLATES: ComplexTransferPattern[] = [
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        from: "0x1982b2f5814301d4e9a8b0201555376e62f82428",
      },
      additionalTransfers: [
        {
          contract: "0x1982b2f5814301d4e9a8b0201555376e62f82428",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from AAVE\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        to: "0x1982b2f5814301d4e9a8b0201555376e62f82428",
      },
      additionalTransfers: [
        {
          contract: "0x1982b2f5814301d4e9a8b0201555376e62f82428",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to AAVE\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        from: "0xa2f987a546d4cd1c607ee8141276876c26b72bdf",
      },
      additionalTransfers: [
        {
          contract: "0x707f9118e33a9b8998bea41dd0d46f38bb963fc8",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Anchor\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        to: "0xa2f987a546d4cd1c607ee8141276876c26b72bdf",
      },
      additionalTransfers: [
        {
          contract: "0x707f9118e33a9b8998bea41dd0d46f38bb963fc8",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Anchor\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0x828b154032950c8ff7cf8085d841723db2696056",
      },
      additionalTransfers: [
        {
          contract: "0x828b154032950c8ff7cf8085d841723db2696056",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Curve concentrated LP\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        to: "0x828b154032950c8ff7cf8085d841723db2696056",
      },
      additionalTransfers: [
        {
          contract: "0x828b154032950c8ff7cf8085d841723db2696056",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Curve concentrated LP\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        from: "0x828b154032950c8ff7cf8085d841723db2696056",
      },
      additionalTransfers: [
        {
          contract: "0x828b154032950c8ff7cf8085d841723db2696056",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Curve concentrated LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        from: "0x828b154032950c8ff7cf8085d841723db2696056",
      },
      additionalTransfers: [
        {
          contract: "0x828b154032950c8ff7cf8085d841723db2696056",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Curve concentrated LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x828b154032950C8ff7CF8085D841723Db2696056",
        from: "0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0",
      },
      additionalTransfers: [
        {
          contract: "0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Curve Gauge\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x828b154032950C8ff7CF8085D841723Db2696056",
        to: "0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0",
      },
      additionalTransfers: [
        {
          contract: "0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were deposited to Curve Gauge\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x828b154032950C8ff7CF8085D841723Db2696056",
        from: "0x5faf6a2d186448dfa667c51cb3d695c7a6e52d8e",
      },
      additionalTransfers: [
        {
          contract: "0x5faf6a2d186448dfa667c51cb3d695c7a6e52d8e",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Yearn stETH-WETH Pool yVault\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x828b154032950C8ff7CF8085D841723Db2696056",
        to: "0x5faf6a2d186448dfa667c51cb3d695c7a6e52d8e",
      },
      additionalTransfers: [
        {
          contract: "0x5faf6a2d186448dfa667c51cb3d695c7a6e52d8e",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were deposited to Yearn stETH-WETH Pool yVault\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        from: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
      },
      additionalTransfers: [
        {
          contract: "0x06325440d014e39736583c165c2963ba99faf14e",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Curve LP\n` +
      `by: ${info.to} (${info.toName})`,
    omit: true,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        to: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
      },
      additionalTransfers: [
        {
          contract: "0x06325440d014e39736583c165c2963ba99faf14e",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Curve LP\n` +
      `by: ${info.from} (${info.fromName})`,
    omit: true,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x06325440d014e39736583c165c2963ba99faf14e",
        from: "0x182b723a58739a9c974cfdb385ceadb237453c28",
      },
      additionalTransfers: [
        {
          contract: "0x182b723a58739a9c974cfdb385ceadb237453c28",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Curve Gauge\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x06325440d014e39736583c165c2963ba99faf14e",
        to: "0x182b723a58739a9c974cfdb385ceadb237453c28",
      },
      additionalTransfers: [
        {
          contract: "0x182b723a58739a9c974cfdb385ceadb237453c28",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Curve Gauge\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x06325440d014e39736583c165c2963ba99faf14e",
        to: "0xdcd90c7f6324cfa40d7169ef80b12031770b4325",
      },
      additionalTransfers: [
        {
          contract: "0xdcd90c7f6324cfa40d7169ef80b12031770b4325",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Yearn: yCRV/stETH Vault\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x06325440d014e39736583c165c2963ba99faf14e",
        from: "0xdcd90c7f6324cfa40d7169ef80b12031770b4325",
      },
      additionalTransfers: [
        {
          contract: "0xdcd90c7f6324cfa40d7169ef80b12031770b4325",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Yearn: yCRV/stETH Vault\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      },
      additionalTransfers: [
        {
          contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Balancer LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      },
      additionalTransfers: [
        {
          contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Balancer LP\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        from: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      },
      additionalTransfers: [
        {
          contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Balancer LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      },
      additionalTransfers: [
        {
          contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Balancer LP\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      },
      additionalTransfers: [
        {
          contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          from: "0xba12222222228d8ba445958a75a0704d566bf2c8",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for WETH in Balancer LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          from: "0xba12222222228d8ba445958a75a0704d566bf2c8",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for wstETH in Balancer LP\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
        from: "0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae",
      },
      additionalTransfers: [
        {
          contract: "0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Balancer Gauge\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
        to: "0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae",
      },
      additionalTransfers: [
        {
          contract: "0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were deposited to Balancer Gauge\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
        from: "0x7818a1da7bd1e64c199029e86ba244a9798eee10",
      },
      additionalTransfers: [
        {
          contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
          to: "0x7818a1da7bd1e64c199029e86ba244a9798eee10",
          from: "0xaf52695e1bb01a16d33d7194c28c42b10e0dbec2",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Aura Finance\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x32296969ef14eb0c6d29669c550d4a0449130230",
        to: "0xaf52695e1bb01a16d33d7194c28c42b10e0dbec2",
      },
      additionalTransfers: [],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were deposited to Aura Finance\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0x27182842e098f60e3d576794a5bffb0777e025d3",
      },
      additionalTransfers: [
        {
          contract: "0xbd1bd5c956684f7eb79da40f582cbe1373a1d593",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Euler\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0x27182842e098f60e3d576794a5bffb0777e025d3",
      },
      additionalTransfers: [
        {
          contract: "0xbd1bd5c956684f7eb79da40f582cbe1373a1d593",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Euler\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        from: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were unwrapped from wstETH\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        to: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were wrapped to wstETH\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        to: "0x828b154032950c8ff7cf8085d841723db2696056",
      },
      additionalTransfers: [
        {
          contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          from: "0x828b154032950c8ff7cf8085d841723db2696056",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for WETH in Curve concentrated LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0x828b154032950c8ff7cf8085d841723db2696056",
      },
      additionalTransfers: [
        {
          contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
          from: "0x828b154032950c8ff7cf8085d841723db2696056",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for stETH in Curve concentrated LP\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x06325440d014e39736583c165c2963ba99faf14e",
        to: "0x989aeb4d175e16225e39e87d0d97a3360524ad80",
      },
      additionalTransfers: [
        {
          contract: "0x9518c9063eb0262d791f38d8d6eb0aca33c63ed0",
          to: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
          from: NULL_ADDRESS,
        },
        {
          contract: "0x9518c9063eb0262d791f38d8d6eb0aca33c63ed0",
          to: "0x0a760466e1b4621579a82a39cb56dda2f4e70f03",
          from: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
        },
        {
          contract: "0x06325440d014e39736583c165c2963ba99faf14e",
          to: "0x99ac10631f69c753ddb595d074422a0922d9056b",
          from: "0x182b723a58739a9c974cfdb385ceadb237453c28",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Curve.fi ETH/stETH Convex Deposit\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x06325440d014e39736583c165c2963ba99faf14e",
        from: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
      },
      additionalTransfers: [
        {
          contract: "0x9518c9063eb0262d791f38d8d6eb0aca33c63ed0",
          from: "0x0a760466e1b4621579a82a39cb56dda2f4e70f03",
          to: NULL_ADDRESS,
        },
        {
          contract: "0x06325440d014e39736583c165c2963ba99faf14e",
          to: "0x182b723a58739a9c974cfdb385ceadb237453c28",
          from: "0x99ac10631f69c753ddb595d074422a0922d9056b",
        },
        {
          contract: "0x06325440d014e39736583c165c2963ba99faf14e",
          to: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
          from: "0x989aeb4d175e16225e39e87d0d97a3360524ad80",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Curve.fi ETH/stETH Convex Deposit\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0x0b925ed163218f6662a35e0f0371ac234f9e9371",
      },
      additionalTransfers: [
        {
          contract: "0x0b925ed163218f6662a35e0f0371ac234f9e9371",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to AaveV3\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0x0b925ed163218f6662a35e0f0371ac234f9e9371",
      },
      additionalTransfers: [
        {
          contract: "0x0b925ed163218f6662a35e0f0371ac234f9e9371",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from AaveV3\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0x0b925ed163218f6662a35e0f0371ac234f9e9371",
      },
      additionalTransfers: [
        {
          contract: "0xc96113eed8cab59cd8a66813bcb0ceb29f06d2e4",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were borrowed on AaveV3\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0x0b925ed163218f6662a35e0f0371ac234f9e9371",
      },
      additionalTransfers: [
        {
          contract: "0xc96113eed8cab59cd8a66813bcb0ceb29f06d2e4",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were repaid to AaveV3\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
      },
      additionalTransfers: [
        {
          contract: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Kyber WETH LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
      },
      additionalTransfers: [
        {
          contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          from: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for WETH in Kyber LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        to: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          from: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for wstETH in Kyber LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0x2b1c7b41f6a8f2b2bc45c3233a5d5fb3cd6dc9a8",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          to: "0x2b1c7b41f6a8f2b2bc45c3233a5d5fb3cd6dc9a8",
          from: "0xebfe63ba0264ad639b3c41d2bfe1ad708f683bc8",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Kyber WETH LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
      },
      additionalTransfers: [
        {
          contract: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were added to Kyber USDC LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
      },
      additionalTransfers: [
        {
          contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          from: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for USDC in Kyber LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        to: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          from: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were swapped for wstETH in Kyber LP\n` +
      `by: ${info.to} (${info.toName})`,
  },

  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0x2b1c7b41f6a8f2b2bc45c3233a5d5fb3cd6dc9a8",
      },
      additionalTransfers: [
        {
          contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
          to: "0x2b1c7b41f6a8f2b2bc45c3233a5d5fb3cd6dc9a8",
          from: "0xe6bcb55f45af6a2895fadbd644ced981bfa825cb",
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Kyber USDC LP\n` +
      `by: ${info.to} (${info.toName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        to: "0x12b54025c112aa61face2cdb7118740875a566e9",
      },
      additionalTransfers: [
        {
          contract: "0x12b54025c112aa61face2cdb7118740875a566e9",
          from: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were supplied to Spark Protocol\n` +
      `by: ${info.from} (${info.fromName})`,
  },
  {
    transferPatterns: {
      mainTransfer: {
        contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
        from: "0x12b54025c112aa61face2cdb7118740875a566e9",
      },
      additionalTransfers: [
        {
          contract: "0x12b54025c112aa61face2cdb7118740875a566e9",
          to: NULL_ADDRESS,
        },
      ],
    },
    description: (info: TransferEventInfo) =>
      `**${info.amountPretty} ${info.tokenName}** ` +
      `were withdrawn from Spark Protocol\n` +
      `by: ${info.to} (${info.toName})`,
  },
];

export const EXCHANGE_STETH_TO_ETH_CURVE_PATTERN: TransferPattern = {
  contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  to: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
};

export const EXCHANGE_ETH_TO_STETH_CURVE_PATTERN: TransferPattern = {
  contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  from: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
};

export const REMOVE_ONE_STETH_CURVE_PATTERN: TransferPattern = {
  contract: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  from: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
};

// EVENT ABIs
export const TRANSFER_EVENT =
  "event Transfer(address indexed _from, address indexed _to, uint256 _value)";

export const CURVE_EXCHANGE_EVENT =
  "event TokenExchange(address indexed buyer, int128 sold_id, uint256 tokens_sold, int128 bought_id, uint256 tokens_bought)";

export const CURVE_ADD_LIQUIDITY_EVENT =
  "event AddLiquidity(address indexed provider, uint256[2] token_amounts, uint256[2] fees, uint256 invariant, uint256 token_supply)";

export const CURVE_REMOVE_LIQUIDITY_EVENT =
  "event RemoveLiquidity(address indexed provider, uint256[2] token_amounts, uint256[2] fees, uint256 token_supply)";

export const CURVE_REMOVE_LIQUIDITY_ONE_EVENT =
  "event RemoveLiquidityOne(address indexed provider, uint256 token_amount, uint256 coin_amount)";

export const CURVE_REMOVE_LIQUIDITY_IMBALANCE_EVENT =
  "event RemoveLiquidityImbalance(address indexed provider, uint256[2] token_amounts, uint256[2] fees, uint256 invariant, uint256 token_supply)";
