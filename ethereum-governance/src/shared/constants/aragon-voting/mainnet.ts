import { ONE_HOUR } from '../../time'

// Perform ad-hoc votes info refresh each BLOCK_WINDOW blocks
export const BLOCK_WINDOW = 1000

// Number of blocks for the whole 5 days
export const FIVE_DAYS_BLOCKS = Math.floor((ONE_HOUR * 24 * 5) / 12)

// 46 hours
export const TRIGGER_AFTER = 46 * ONE_HOUR

// 48 hours
export const PHASE_ONE_DURATION = 48 * ONE_HOUR

// The list of public delegates was provided by DAO Ops workstream member
export const PUBLIC_DELEGATES_MAP: Record<string, string | undefined> = {
  '0x33379367200ac200182ccd4abd71683f2d24e373': 'Matt Stam',
  '0x3ddc7d25c7a1dc381443e491bbf1caa8928a05b0': 'Ignas',
  '0xb933aee47c438f22de0747d57fc239fe37878dd1': 'Wintermute Governance',
  '0x8ab6612bbcf7e133a6bb03b3264718d30f25e0ba': 'WPRC (WhitePaper Reading Club)',
  '0xb79294d00848a3a4c00c22d9367f19b4280689d7': 'Tane',
  '0xc1c2e8a21b86e41d1e706c232a2db5581b3524f8': 'SEEDOrg',
  '0x42e6dd8d517abb3e4f6611ca53a8d1243c183fb0': 'Anthony Leuts',
  '0x2d7d6ec6198adfd5850d00bd601958f6e316b05e': 'Sov',
  '0x1f76a6bf03429480472b3695e08689219ce15ed6': 'Polar',
  '0x2cc1ade245020fc5aae66ad443e1f66e01c54df1': 'TokenLogic',
  '0xff4139e99bd7c23f4611dc660c33c97a825ea67b': 'BlockworksResearch',
  '0x3b9f47629cd4d5903cf3eb897aac4f6b41dd2589': 'Blockful (Daniela Zschaber)',
  '0x8787fc2de4de95c53e5e3a4e5459247d9773ea52': 'karpatkey',
  '0xecc2a9240268bc7a26386ecb49e1befca2706ac9': 'StableLab',
  '0xbeb3364D14DbB4D9A406966B97B9FB3fF8aB7646': 'DegentradingLSD',
  '0x000b4369b71b6634f27f5de9cbaaabb0d21b8be5': 'NodeSoda',
  '0x5ef980c7bda50c81e8fb13dff2b804113065ed1c': 'eboadom (Ernesto)',
  '0x4f894bfc9481110278c356ade1473ebe2127fd3c': 'ReservoirDAO',
  '0x070341aa5ed571f0fb2c4a5641409b1a46b4961b': 'FranklinDAO',
  '0x61cc8f06f3b6e1a3fba28cbebc4c89304b1187d1': 'Mog',
  '0xb6647e02ae6dd74137cb80b1c24333852e4af890': 'Pol Lanski',
  '0xce3b1e215f379a5eddbc1ee80a6de089c0b92e55': 'notjamiedimon',
  '0x06a90756e57bc7a016eed0ab23fc36d11c42bba0': 'Irina',
  '0x98308b6da79b47d15e9438cb66831563649dbd94': 'marcbcs',
  '0x04827a54f2e345467beafefb9ef76cb2f2c62d83': 'Daedalus Collective',
  '0x7a5959855b6508af1055af460331fb697dd08e22': 'ProRelGuild',
  '0xf163d77b8efc151757fecba3d463f3bac7a4d808': 'Today in DeFi',
  '0x18c674f655594f15c490aeeac737895b7903e37f': 'Next Finance Tech',
  '0x6f9bb7e454f5b3eb2310343f0e99269dc2bb8a1d': 'cp0x',
  '0xcedf324843775c9e7f695251001531798545614b': 'Simply Staking',
  '0x6de8448e7d5f58af394cc9540abe703d0c955dfd': 'Boardroom',
  '0xc3a673736415bbf5ba8a8e0642ec3ab16f4ada24': 'Proof Group',
  '0x58b1b454dbe5156acc8fc2139e7238451b59f432': 'Lemma Solutions',
  '0xa4181c75495f60106ae539b7c55c0d263f2fb737': 'Nansen',
  '0x057928bc52bd08e4d7ce24bf47e01ce99e074048': 'DAOplomats',
  '0x3fb19771947072629c8eee7995a2ef23b72d4c8a': 'PGov.eth',
}
