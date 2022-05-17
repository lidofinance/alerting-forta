import BigNumber from "bignumber.js";

// COMMON CONSTS
export const ETH_DECIMALS = new BigNumber(10 ** 18);

export const TX_AMOUNT_THRESHOLD = 10000;

// ADDRESSES
export const MONITORED_TOKENS = {
  stETH: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  wstETH: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  steCRV: "0x06325440d014e39736583c165c2963ba99faf14e",
  steCRV_gauge: "0x182b723a58739a9c974cfdb385ceadb237453c28",
  astETH: "0x1982b2f5814301d4e9a8b0201555376e62f82428",
  ies: "0xc383a3833a87009fd9597f8184979af5edfad019",
  oneInch_lp: "0x1f629794b34ffb3b29ff206be5478a52678b47ae",
  rstETH_theta: "0x53773e034d9784153471813dacaff53dbbb78e8c",
  rstETH_theta_gauge: "0x4e079dca26a4fe2586928c1319b20b1bf9f9be72",
  rETH_wstETH: "0x447ddd4960d9fdbf6af9a790560d0af76795cb08",
  rETH_wstETH_f_gauge: "0x8ad7e0e6edc61bc48ca0dd07f9021c249044ed30",
  slp: "0xc5578194d457dcce3f272538d1ad52c68d1ce849",
  fwstETH_8: "0x7259ee19d6b5e755e7c65cecfd2466c09e251185",
  fsteCRV: "0xc27bfe32e0a934a12681c1b35acf0dba0e7460ba",
  sdsteCRV: "0xbc10c4f7b9fe0b305e8639b04c536633a3db7065",
  icETH: "0x7c07f7abe10ce8e33dc6c5ad68fe033085256a84",
  ETHmaxy: "0x0fe20e0fa9c78278702b05c333cc000034bb69e2",
  //IDOL: "0x439cac149b935ae1d726569800972e1669d17094",
  uni_v2_stETH_2: "0x4028daac072e492d34a3afdbef0ba7e35d8b55c4",
  enzf_p10x: "0xfa61d61db727573c9bd8e447122b2350ccef9d61",
  iwstETH: "0xbfd291da8a403daaf7e5e9dc1ec0aceacd4848b9",
  fwstETH_146: "0x49da42a1eca4ac6ca0c6943d9e5dc64e4641e0e3",
  enzf: "0x48143538590587df4de00a77c2dd52f689088335",
  farm_1lp_ldo: "0x8acdb3bcc5101b1ba8a5070f003a77a2da376fe8",
  uni_v2_USDC_STABLEx: "0x1bcce9e2fd56e8311508764519d28e6ec22d4a47",
  stablex3crv_f_ARCx: "0x3252efd4ea2d6c78091a1f43982ee2c3659cc3d1",
  stablex3crv_f: "0x6c0ffb49ad9072f253e254445cfd829bcb8a1b5d",
  istablex: "0xec18ffea29dacc0f47525529fd1fd1d4a40fe65c",
};

// EVENT ABIs
export const TRANSFER_EVENT =
  "event Transfer(address indexed _from, address indexed _to, uint256 _value)";
