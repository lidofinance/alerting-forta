export const ACCOUNTING_ORACLE_ADDRESS =
  "0x76f358a842defa0e179a8970767cff668fc134d6";
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0x8d87a8bcf8d4e542fd396d1c50223301c164417b";

export const ACCOUNTING_ORACLE_MEMBERS = new Map<string, string>([
  // todo: should be renamed to right names
  ["0x19b1bebe4773fec2496fef8b81a9c175a823844b", "Chorus One"],
  ["0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9", "Chorus One"],
  ["0x4c75FA734a39f3a21C57e583c1c29942F021C6B7", "Staking Facilities"],
  ["0xA8aF49FB44AAA8EECa9Ae918bb7c05e2E71c9DE9", "P2P Validator"],
  ["0x3799bDA7B884D33F79CEC926af21160dc47fbe05", "Stakefish"],
  ["0x1a13648EE85386cC101d2D7762e2848372068Bc3", "Rated"],
  ["0xb29dD2f6672C0DFF2d2f173087739A42877A5172", "bloXroute"],
  ["0xfdA7E01B2718C511bF016030010572e833C7aE6A", "Instadapp"],
  ["0x81E411f1BFDa43493D7994F82fb61A415F6b8Fd4", "Kyber Network"],
]);

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_SUBMIT_DELAY = 15744; // 41 epoch in seconds
