import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);
// 1 LDO
export const LDO_DECIMALS = new BigNumber(10).pow(18);

// alert if more than 2 token types delegated to non-whitelist address
export const UNIQ_TOKENS_THRESHOLD = 2;
// alert again if more than 1 additional token type added to delegated to non-whitelist address
export const UNIQ_TOKENS_CHANGE_THRESHOLD = 1;
// alert if more than 10 addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_THRESHOLD = 10;
// alert again if more than 10 additional addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_CHANGE_THRESHOLD = 10;

// set alert reproduction frequency to 7 days
// alert can be produced earlier only if UNIQ_TOKENS_CHANGE_THRESHOLD and UNIQ_DELEGATES_CHANGE_THRESHOLD thresholds are reached
export const ALERT_SILENCE_PERIOD = 60 * 60 * 24 * 7;

// ADDRESSES, EVENTS, ABIs

export const MONITORED_ERC20_ADDRESSES = new Map<string, string>([
  ["0x5a98fcbea516cf06857215779fd812ca3bef1b32", "LDO"],
  ["0xae7ab96520de3a18e5e111b5eaab095312d7fe84", "stETH"],
  ["0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", "wstETH"],
  ["0x707f9118e33a9b8998bea41dd0d46f38bb963fc8", "bETH"],
  ["0x1982b2f5814301d4e9a8b0201555376e62f82428", "astETH"],
  ["0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599", "stMATIC"],
]);

export const WHITE_LIST_ADDRESSES = {
  // owned by Lido
  curvePool: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  balancerPool: "0x32296969ef14eb0c6d29669c550d4a0449130230",
  oneInchPool: "0xc1a900ae76db21dc5aa8e418ac0f4e888a4c7431",
  sushiPool: "0xc5578194d457dcce3f272538d1ad52c68d1ce849",
  wstETH: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  // externally owned
  aaveLandingPoolV2: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
  oneInchV4Router: "0x1111111254fb6c44bac0bed2854e76f90643097d",
  metamaskSwapRouter: "0x881d40237659c251811cec9c364ef91dc08d300c",
  paraswapV5TokenTransferProxyMainnet:
    "0x216b4b4ba9f3e719726886d34a177484278bfcae",
  paraSwapLiquiditySwapAdapter: "0x135896de8421be2ec868e0b811006171d9df802a",
  sushiSwapRouter: "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",
  anchorVault: "0xa2f987a546d4cd1c607ee8141276876c26b72bdf",
  uniswapV3Router2: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
  uniswapV3Router: "0xe592427a0aece92de3edee1f18e0157c05861564",
  uniswapV2Router2: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  uniswapV3PositionsNFT: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
  zeroXExchangeProxy: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  zeroExProxy: "0xe66b31678d6c16e9ebf358268a790b763c133750",
  balancerVault: "0xba12222222228d8ba445958a75a0704d566bf2c8",
  oneInchV3: "0x11111112542d85b3ef69ae05771c2dccff4faa26",
  coWProtocolGPv2VaultRelayer: "0xc92e8bdf79f0507f65a392b0ab4667716bfe0110",
  curveRETHtoWstETH: "0x447ddd4960d9fdbf6af9a790560d0af76795cb08",
  zapperZap: "0x8e52522e6a77578904ddd7f528a22521dc4154f5",
  wormholeTokenBridge: "0x3ee18b2214aff97000d974cf647e7c347e8fa585",
  ribbonFinanceStETHCoveredCallVault:
    "0x53773e034d9784153471813dacaff53dbbb78e8c",
  DODOApproveV2: "0xcb859ea579b28e02b87a1fde08d087ab9dbe5149",
  mooniswap: "0x1f629794b34ffb3b29ff206be5478a52678b47ae",
  sensePeriphery: "0x9a8fbc2548da808e6cbc853fee7e18fb06d52f18",
  dForceWstETH: "0xbfd291da8a403daaf7e5e9dc1ec0aceacd4848b9",
  OlympusV2ZapIn: "0x6f5cc3edea92ab52b75bad50bcf4c6daa781b87e",
  curveRouter: "0xfa9a30350048b2bf66865ee20363067c66f67e58",
  tokenlonAllowanceTarget: "0x8a42d311d282bfcaa5133b2de0a8bcdbecea3073",
  alchemixFinanceAlETHAlchemistV2: "0x062bf725dc4cdf947aa79ca2aaccd4f385b13b5c",
  ftxExchange: "0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2",
  setProtocolDebtIssuanceModuleV2: "0x69a592d2129415a4a1d1b1e309c17051b7f28d57",
  newUniswapV2ExchangeRouter: "0xf9234cb08edb93c0d4a4d4c70cc3ffd070e78e07",
  senseDivider: "0x86ba3e96be68563e41c2f5769f1af9faf758e6e0",
  idolNftMain: "0x439cac149b935ae1d726569800972e1669d17094",
  idleLidoStETHAABBPerpTranche: "0x34dcd573c5de4672c8248cd12a99f875ca112ad8",
  instaEthStrategy: "0xc383a3833a87009fd9597f8184979af5edfad019",
  curveZapInGeneralV5: "0x5ce9b49b7a1be9f2c3dc2b2a5bacea56fa21fbee",
  oneInchLimitOrdersProtocolV2: "0x119c71d3bbac22029622cbaec24854d3d32d2828",
  polygonERC20Bridge: "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf",
  aPWineController: "0x4ba30fa240047c17fc557b8628799068d4396790",
  DisperseApp: "0xd152f549545093347a162dce210e7293f1452150",
  zkSync: "0xabea9132b05a70803a4e85094fd0e1800777fbef",
  deversiFiBridge: "0x5d22045daceab03b158031ecb7d9d06fad24609b",
  someIdleFinanceContract: "0x0cac674ebd77bbd899f6079932768f6d59da089a",
};

export const APPROVE_EVENT_ABI =
  "event Approval (address indexed owner, address indexed spender, uint256 value)";
