import {
  EASY_TRACK_ADDRESS as easyTrackAddress,
  INCREASE_STAKING_LIMIT_ADDRESS as increaseStakingLimitAddress,
  EVM_SCRIPT_EXECUTOR_ADDRESS as evmExecutorAddress,
  REWARD_PROGRAMS_REGISTRY_ADDRESS as rewardProgramRegistryAddress,
} from 'constants/common'
import { STONKS_ALLOWED_RECIPIENT_ADDRESS } from 'constants/stonks'
import { Blockchain } from '../../contracts'

export const INCREASE_STAKING_LIMIT_ADDRESS = increaseStakingLimitAddress
export const EVM_SCRIPT_EXECUTOR_ADDRESS = evmExecutorAddress
export const REWARD_PROGRAMS_REGISTRY_ADDRESS = rewardProgramRegistryAddress
export const EASY_TRACK_ADDRESS = easyTrackAddress

export const EASY_TRACK_TYPES_BY_FACTORIES = new Map<string, string>([
  [increaseStakingLimitAddress, 'Increase node operator staking limit'],
  ['0x929547490ceb6aeedd7d72f1ab8957c0210b6e51', 'Add referral partner'],
  ['0xe9eb838fb3a288bf59e9275ccd7e124fdff88a9c', 'Remove referral partner'],
  ['0x54058ee0e0c87ad813c002262cd75b98a7f59218', 'Top up referral partner'],
  ['0x1dcfc37719a99d73a0ce25ceecbefbf39938cf2c', 'Add recipient (reWARDS)'],
  ['0x00bb68a12180a8f7e20d8422ba9f81c07a19a79e', 'Remove recipient (reWARDS)'],
  ['0x85d703b2a4bad713b596c647badac9a1e95bb03d', 'Top up recipients (reWARDS)'],
  ['0x00caaef11ec545b192f16313f53912e453c91458', 'Top up recipients (LEGO LDO)'],
  ['0x0535a67ea2d6d46f85fe568b7eaa91ca16824fec', 'Top up recipients (LEGO DAI)'],
  ['0x84f74733ede9bfd53c1b3ea96338867c94ec313e', 'Top up recipients (RCC DAI)'],
  ['0x4e6d3a5023a38ce2c4c5456d3760357fd93a22cd', 'Top up recipients (PML DAI)'],
  ['0x67fb97abb9035e2e93a7e3761a0d0571c5d7cd07', 'Top up recipients (ATC DAI)'],
  ['0x41F9daC5F89092dD6061E59578A2611849317dc8', 'Top up recipients (GAS ETH)'],
  ['0x009ffa22ce4388d2f5de128ca8e6fd229a312450', 'Top up recipients (Referral Program DAI)'],
  ['0xbd2b6dc189eefd51b273f5cb2d99ba1ce565fb8c', 'Top up recipients (TRP LDO)'],
  ['0x935cb3366faf2cfc415b2099d1f974fd27202b77', 'Add recipient (stETH reWARDS)'],
  ['0x22010d1747cafc370b1f1fbba61022a313c5693b', 'Remove recipient (stETH reWARDS)'],
  ['0x1f2b79fe297b7098875930bba6dd17068103897e', 'Top up recipients (stETH reWARDS)'],
  ['0xe5656eee7eed02bde009d77c88247bc8271e26eb', 'Top up recipients (Alliance Ops stablecoins)'],
  ['0x87b02df27cd6ec128532add7c8bc19f62e6f1fb9', 'Top up recipients (ATC stETH)'],
  ['0x6e04aed774b7c89bb43721acdd7d03c872a51b69', 'Top up recipients (Stonks stETH)'],
  ['0x161a4552a625844c822954c5acbac928ee0f399b', '[SDVT] Update target validator limits'],
  ['0xd75778b855886fc5e1ea7d6bfada9eb68b35c19d', '[SDVT] Set vetted validators limits'],
  ['0x589e298964b9181d9938b84bb034c3bb9024e2c0', '[SDVT] Set node operators reward addresses'],
  ['0xcaa3af7460e83e665eefec73a7a542e5005c9639', '[SDVT] Add Node Operators'],
  ['0x1f809d2cb72a5ab13778811742050eda876129b6', 'Add Rewards Share Program participant'],
  ['0xbd08f9d6bf1d25cc7407e4855df1d46c2043b3ea', 'Top up recipients (Rewards Share stETH)'],
  ['0x6ab39a8be67d9305799c3f8fdfc95caf3150d17c', 'Top up recipients (LEGO stablecoins)'],
  ['0x75bdecbb6453a901ebbb945215416561547dfdd4', 'Top up recipients (RCC stablecoins)'],
  ['0x92a27c4e5e35cfea112acab53851ec70e2d99a8d', 'Top up recipients (PML stablecoins)'],
  ['0x1843bc35d1fd15abe1913b9f72852a79457c42ab', 'Top up recipients (ATC stablecoins)'],
  ['0xF6B6E7997338C48Ea3a8BCfa4BB64a315fDa76f4', 'Settle EL Rewards Stealing penalty for CSM operators'],
])

export const EASY_TRACK_STONKS_CONTRACTS = [STONKS_ALLOWED_RECIPIENT_ADDRESS]
export const TOP_UP_ALLOWED_RECIPIENTS_CONTRACT = '0x87b02df27cd6ec128532add7c8bc19f62e6f1fb9'

export const SAFES = {
  [Blockchain.ETH]: [
    ['0x17f6b2c738a63a8d3a113a228cfd0b373244633d', 'Pool Maintenance Labs Ltd. (PML)'],
    ['0x9b1cebf7616f2bc73b47d226f90b01a7c9f86956', 'Argo Technology Consulting Ltd. (ATC)'],
    ['0xde06d17db9295fa8c4082d4f73ff81592a3ac437', 'Resourcing and Compensation Committee (RCC)'],
    ['0x87d93d9b2c672bf9c9642d853a8682546a5012b5', 'Liquidity Observation Lab (Ethereum)'],
    ['0x12a43b049a7d330cb8aeab5113032d18ae9a9030', 'LEGO Committee'],
    ['0xe2a682a9722354d825d1bbdf372cc86b2ea82c8c', 'Rewards Share Committee'],
    ['0x3cd9f71f80ab08ea5a7dca348b5e94bc595f26a0', 'Lido Dev team (Ethereum)'],
    ['0x5181d5d56af4f823b96fe05f062d7a09761a5a53', 'Depositor bot gas funding (Ethereum)'],
    ['0x73b047fe6337183A454c5217241D780a932777bD', 'Emergency Brakes (Ethereum)'],
    ['0xd65Fa54F8DF43064dfd8dDF223A446fc638800A9', 'Lido-on-polygon multisig upgrader'],
    ['0x834560f580764bc2e0b16925f8bf229bb00cb759', 'TRP Committee'],
    ['0xa02FC823cCE0D016bD7e17ac684c9abAb2d6D647', 'Treasury Management Committee'],
    ['0x98be4a407bff0c125e25fbe9eb1165504349c37d', 'Relay Maintenance Committee'],
    ['0x8772e3a2d86b9347a2688f9bc1808a6d8917760c', 'Gate Seal Committee'],
  ],
  [Blockchain.POLYGON]: [['0x87d93d9b2c672bf9c9642d853a8682546a5012b5', 'Liquidity Observation Lab (Polygon)']],
  [Blockchain.ARBITRUM]: [
    ['0x8c2b8595ea1b627427efe4f29a64b145df439d16', 'Liquidity Observation Lab (Arbitrum)'],
    ['0xfdcf209a213a0b3c403d543f87e74fcbca11de34', 'Emergency Brakes (Arbitrum)'],
    ['0x1840c4D81d2C50B603da5391b6A24c1cD62D0B56', 'Liquidity Observation Lab ARB Token Multisig (Arbitrum)'],
    ['0x421eB124FCbF69CE9B26C13719D7c288e6D6A94c', 'Lido Subgraph NFT owner (Arbitrum)'],
  ],
  [Blockchain.OPTIMISM]: [
    ['0x5033823f27c5f977707b58f0351adcd732c955dd', 'Liquidity Observation Lab (Optimism)'],
    ['0x4cf8fe0a4c2539f7efdd2047d8a5d46f14613088', 'Emergency Brakes (Optimism)'],
    ['0x91ce2f083d59b832f95f90aa0997168ae051a98a', 'Liquidity Observation Lab OP Token Multisig (Optimism)'],
    ['0x75483CE83100890c6bf1718c26052cE44e0F2839', 'Liquidity Observation Lab AAVE rewards (Optimism)'],
  ],
  [Blockchain.MOONBEAM]: [
    ['0x007132343ca619c5449297507b26c3f85e80d1b1', 'Liquidity Observation Lab (Moonbeam)'],
    ['0x34fc04fa7e8e142001aaeed25da8cf7dd887a5f3', 'Contracts updater (Moonbeam)'],
    ['0xd00e0d8e42b8222745f4e921c6fa7ff620fa8e96', 'Parameters manager (Moonbeam)'],
    ['0xab4046bdf1a58c628d925602b05fb1696b74ac2c', 'Parameters setter (Moonbeam)'],
    ['0x3ef396fa1a363025b3cedc07d828fa512ccc7156', 'Renomination manager (Moonbeam)'],
  ],
  [Blockchain.MOONRIVER]: [
    ['0xdafc1dcb93da415604ac6187638f88a8ff8d77a4', 'Liquidity Observation Lab (Moonriver)'],
    ['0xdafc1dcb93da415604ac6187638f88a8ff8d77a4', 'Contracts updater (Moonriver)'],
    ['0xf3b2c83400d60ee91f716eaa4e9ef59c49f2d1ae', 'Parameters manager (Moonriver)'],
    ['0xb4d206664c53986b66eba65203c7f2d2924ab351', 'Parameters setter (Moonriver)'],
    ['0xc4520846052adc9d92ad161a5bde907869cd0da4', 'Renomination manager (Moonriver)'],
  ],
}
