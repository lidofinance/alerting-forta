import BigNumber from "bignumber.js";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// alert if more than 2 token types delegated to non-whitelist address
export const UNIQ_TOKENS_THRESHOLD = 2;
// alert again if more than 1 additional token type added to delegated to non-whitelist address
export const UNIQ_TOKENS_CHANGE_THRESHOLD = 1;

// alert if more than 2 addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_THRESHOLD_EOA = 2;
// alert again if more than 2 additional addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_CHANGE_THRESHOLD_EOA = 2;

// alert if more than 10 addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_THRESHOLD_CONTRACT = 10;
// alert again if more than 10 additional addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_CHANGE_THRESHOLD_CONTRACT = 10;

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

const WHITE_LIST_ADDRESSES_RAW: string[] = [
  // owned by Lido
  "0xdc24316b9ae028f1497c275eb9192a3ea0f67022", // curvePool
  "0x32296969ef14eb0c6d29669c550d4a0449130230", // balancerPool
  "0xc1a900ae76db21dc5aa8e418ac0f4e888a4c7431", // oneInchPool
  "0xc5578194d457dcce3f272538d1ad52c68d1ce849", // sushiPool
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH
  "0x828b154032950c8ff7cf8085d841723db2696056", // curveStEthWEthPool
  // externally owned
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9", // aaveLandingPoolV2
  "0x1111111254fb6c44bac0bed2854e76f90643097d", // oneInchV4Router
  "0x881d40237659c251811cec9c364ef91dc08d300c", // metamaskSwapRouter
  "0x216b4b4ba9f3e719726886d34a177484278bfcae", // paraSwapV5TokenTransferProxyMainnet
  "0x135896de8421be2ec868e0b811006171d9df802a", // paraSwapLiquiditySwapAdapter
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f", // sushiSwapRouter
  "0xa2f987a546d4cd1c607ee8141276876c26b72bdf", // anchorVault
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", // uniswapV3Router2
  "0xe592427a0aece92de3edee1f18e0157c05861564", // uniswapV3Router
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // uniswapV2Router2
  "0xc36442b4a4522e871399cd717abdd847ab11fe88", // uniswapV3PositionsNFT
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // zeroXExchangeProxy
  "0xe66b31678d6c16e9ebf358268a790b763c133750", // zeroExProxy
  "0xba12222222228d8ba445958a75a0704d566bf2c8", // balancerVault
  "0x11111112542d85b3ef69ae05771c2dccff4faa26", // oneInchV3
  "0xc92e8bdf79f0507f65a392b0ab4667716bfe0110", // coWProtocolGPv2VaultRelayer
  "0x447ddd4960d9fdbf6af9a790560d0af76795cb08", // curveRETHtoWstETH
  "0x8e52522e6a77578904ddd7f528a22521dc4154f5", // zapperZap
  "0x6d9893fa101cd2b1f8d1a12de3189ff7b80fdc10", // zapperUniswap
  "0x3ee18b2214aff97000d974cf647e7c347e8fa585", // wormholeTokenBridge
  "0x53773e034d9784153471813dacaff53dbbb78e8c", // ribbonFinanceStETHCoveredCallVault
  "0xcb859ea579b28e02b87a1fde08d087ab9dbe5149", // dODOApproveV2
  "0x1f629794b34ffb3b29ff206be5478a52678b47ae", // mooniSwap
  "0x9a8fbc2548da808e6cbc853fee7e18fb06d52f18", // sensePeriphery
  "0xbfd291da8a403daaf7e5e9dc1ec0aceacd4848b9", // dForceWstETH
  "0x6f5cc3edea92ab52b75bad50bcf4c6daa781b87e", // OlympusV2ZapIn
  "0xfa9a30350048b2bf66865ee20363067c66f67e58", // curveRouter
  "0x8a42d311d282bfcaa5133b2de0a8bcdbecea3073", // tokenlonAllowanceTarget
  "0x062bf725dc4cdf947aa79ca2aaccd4f385b13b5c", // alchemixFinanceAlETHAlchemistV2
  "0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2", // ftxExchange
  "0x69a592d2129415a4a1d1b1e309c17051b7f28d57", // setProtocolDebtIssuanceModuleV2
  "0xf9234cb08edb93c0d4a4d4c70cc3ffd070e78e07", // newUniswapV2ExchangeRouter
  "0x86ba3e96be68563e41c2f5769f1af9faf758e6e0", // senseDivider
  "0x439cac149b935ae1d726569800972e1669d17094", // idolNftMain
  "0x34dcd573c5de4672c8248cd12a99f875ca112ad8", // idleLidoStETHAABBPerpTranche
  "0xc383a3833a87009fd9597f8184979af5edfad019", // instaEthStrategy
  "0x5ce9b49b7a1be9f2c3dc2b2a5bacea56fa21fbee", // curveZapInGeneralV5
  "0x119c71d3bbac22029622cbaec24854d3d32d2828", // oneInchLimitOrdersProtocolV2
  "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf", // polygonERC20Bridge
  "0x4ba30fa240047c17fc557b8628799068d4396790", // aPWineController
  "0xd152f549545093347a162dce210e7293f1452150", // disperseApp
  "0xabea9132b05a70803a4e85094fd0e1800777fbef", // zkSync
  "0x5d22045daceab03b158031ecb7d9d06fad24609b", // deversiFiBridge
  "0x0cac674ebd77bbd899f6079932768f6d59da089a", // someIdleFinanceContract
  "0xb5eb8cb6ced6b6f8e13bcd502fb489db4a726c7b", // oasisMultiply
  "0x32707372b88bef099dd2ae190804e519831eedf4", // gldmGenesisRewardPool
  "0xf8b8db73db0c3f4ff0d633836e939db23847ca1e", // curveRegistryExchange
  "0x81c46feca27b31f3adc2b91ee4be9717d1cd3dd7", // curveRegistryExchange2
  "0xcd9595a4da4a0268217845d7fc8f576b75596e70", // dSProxy175787
  "0xc319bcfd24e50fcf932c98b43bf7ab10460f7ab2", // dSProxy212804
  "0x414ff9b9aaf625593c9015ffed35e2cdbf310384", // dsProxy9774
  "0xb9d5132f9bc799b3af59016aebbac8e32099ba46", // dsProxy208421
  "0xc319bcfd24e50fcf932c98b43bf7ab10460f7ab2", // deFiSaverTEProxy
  "0x1bd435f3c054b6e901b7b108a0ab7617c808677b", // paraSwapP4
  "0x80aca0c645fedabaa20fd2bf0daf57885a309fe6", // paraSwapRepayAdapter
  "0x36c744dd2916e9e04173bee9d93d554f955a999d", // senseWstETHAdapter
  "0x27182842e098f60e3d576794a5bffb0777e025d3", // euler
  "0x78106f7db3ebcee3d2cfac647f0e4c9b06683b39", // dustSweeper
  "0x95e6f48254609a6ee006f7d493c8e5fb97094cef", // 0x: ERC20 Proxy
  "0x9d3a1c83cb5ad71fb66fc7d94f11fbe7eaa3054b", // DeFi saver automated proxy
  "0x6352a56caadc4f1e25cd6c75970fa768a3304e64", // OpenOcean: Exchange V2
  "0x3e66be3e817a283c7ee01f5057d99660e7a01974", // DSProxy #212,449
  "0x362fa9d0bca5d19f743db50738345ce2b40ec99f", // LiFiDiamond
  "0xd8ef3cace8b4907117a45b0b125c68560532f94d", // Set: Basic Issuance Module
  "0xa0a33f0cc7c655015ce50ff998b95eead0fa41ca", // DSProxy #212,569
  "0x77b1e5d58247bc3300a8e646b018fcebfee5a59c", // Integral: Delay
  "0xaa8adbdd94824e5c381ca4a262762945b353359f", // 1inch Liquidity Protocol (Ethereum) ETH/STETH
  "0x9DDb2da7Dd76612e0df237B89AF2CF4413733212", // BribeVault
  "0x1ef7a557cfa8436ee08790e3f2b190b8937fda0e", // HolyHeld: Central Transfer Proxy
  "0x248ccbf4864221fc0e840f29bb042ad5bfc89b5c", // Maker(wstETH-B)
  "0xfff11417a58781d3c72083cb45ef54d79cd02437", // sense-finance periphery
  "0xb188b1cb84fb0ba13cb9ee1292769f903a9fec59", // aurafinance RewardDepositWrapper
  "0x00000000009726632680fb29d3f7a9734e3010e2", // rainbow swap aggregator
  "0xbab1e772d70300422312dff12daddcb60864bd41", // pods-yield stETH vault
  "0x6fc4843aac4786b4420e954a2271be16f225a482", // sense.finance WstETHAdapter
  "0x617dee16b86534a5d792a4d7a62fb491b544111e", // kyber.network MetaAggregationRouter
  "0x83C8F28c26bF6aaca652Df1DbBE0e1b56F8baBa2", // GemSwap
  "0x0e3EB2eAB0e524b69C79E24910f4318dB46bAa9c", // OptimizedTransparentUpgradeableProxy
];

export const WHITE_LIST_ADDRESSES: string[] = WHITE_LIST_ADDRESSES_RAW.map(
  (address) => address.toLowerCase()
);

export const APPROVE_EVENT_ABI =
  "event Approval (address indexed owner, address indexed spender, uint256 value)";
