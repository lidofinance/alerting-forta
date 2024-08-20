import { strict as assert } from 'node:assert'
import { Result as EventArgs } from '@ethersproject/abi/lib'
import { FindingSeverity, FindingType } from 'forta-agent'
import { formatAddress } from 'forta-agent/dist/cli/utils'
import { EventOfNotice, SimulateFunc } from './entity/events'
import { Contract, ethers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'


const MIN_PROXY_ABI = [
  'function proxy__getAdmin() external view returns (address)',
  'function proxy__getImplementation() view returns (address)',
  'function proxy__changeAdmin(address owner)',
  'function proxy__upgradeTo(address _newImplementation)',
  'function proxy__ossify()',
  'function proxy__getIsOssified() view returns (bool)',
]

const MIN_GOV_EXECUTOR_ABI = [
  'function updateEthereumGovernanceExecutor(address ethereumGovernanceExecutor)',
  'function getEthereumGovernanceExecutor() view returns (address)',
]


export function skipNetwork(network: L2Network) {
  if (network === L2Network.Default
   || network === L2Network.ZkSync
  //  || network === L2Network.Scroll
  //  || network === L2Network.Optimism
  //  || network === L2Network.Mantle
  ) {
    return true
  } else {
    return false
  }
}


export enum L2Network {
  Default = 'Default',
  Optimism = 'Optimism',
  Mantle = 'Mantle',
  ZkSync = 'ZkSync',
  Scroll = 'Scroll',
}


enum ContractType {
  L2TokensBridge = 'L2TokensBridge',
  L2GovExecutor = 'L2GovExecutor',
  L2Wsteth = 'L2Wsteth',
  L2ProxyAdmin = 'ProxyAdmin',
}


export type ContractsSheet = {
  [key: string]: { // one of enum L2Network
    [key: string]: string,
  }
}

export const contractsSheet: ContractsSheet = {
  [L2Network.Optimism]: {
    [ContractType.L2TokensBridge]: '0x8e01013243a96601a86eb3153f0d9fa4fbfb6957',
    [ContractType.L2GovExecutor]: '0xefa0db536d2c8089685630fafe88cf7805966fc3',
    [ContractType.L2Wsteth]: '0x1f32b1c2345538c0c6f582fcb022739c4a194ebb',
  },
  [L2Network.Mantle]: {
    [ContractType.L2TokensBridge]: '0x9c46560D6209743968cC24150893631A39AfDe4d',
    [ContractType.L2GovExecutor]: '0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd',
    [ContractType.L2Wsteth]: '0x458ed78EB972a369799fb278c0243b25e5242A83',
    [ContractType.L2ProxyAdmin]: '0x8e34d07eb348716a1f0a48a507a9de8a3a6dce45',
  },
  [L2Network.ZkSync]: {
    [ContractType.L2TokensBridge]: '0xe1d6a50e7101c8f8db77352897ee3f1ac53f782b',
    [ContractType.L2GovExecutor]: '0x139ee25dcad405d2a038e7a67f9ffdbf0f573f3c',
    [ContractType.L2Wsteth]: '0x703b52F2b28fEbcB60E1372858AF5b18849FE867',
    [ContractType.L2ProxyAdmin]: '0xbd80e505ecc49bae2cc86094a78fa0e2db28b52a',
  },
  [L2Network.Scroll]: {
    [ContractType.L2TokensBridge]: '0x8aE8f22226B9d789A36AC81474e633f8bE2856c9',
    [ContractType.L2GovExecutor]: '0x0c67D8D067E349669dfEAB132A7c03A90594eE09',
    [ContractType.L2Wsteth]: '0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32',
    [ContractType.L2ProxyAdmin]: '0x8e34D07Eb348716a1f0a48A507A9de8a3A6DcE45',
  },
}


export type NameArgs = { network: string }

export type EventBundlesSheet =
 {
  [key: string]: {
    name: (_: NameArgs) => string,
    severity: FindingSeverity,
    event: string,
    description: (contractAlias: string, address: string) => (_: EventArgs) => string,
    contracts: {
      [key: string]: ContractType[],
    },
    simulate?: SimulateFunc,
  }
}


export const eventBasedAlertBundleSheet: EventBundlesSheet = {
  'PROXY-UPGRADED': {
    name: (_: NameArgs) => `🚨 ${_.network}:  Proxy upgraded`,
    severity: FindingSeverity.High,
    description: (contractAlias: string, address: string) => {
      return (_: EventArgs) => {
        return `Proxy for ${contractAlias}(${address}) ` +
        `was updated to ${_.implementation}` +
        `\n(detected by event)`
      }
    },
    event: 'event Upgraded(address indexed implementation)',
    contracts: {
      [L2Network.Default]: [ContractType.L2TokensBridge, ContractType.L2Wsteth],
      [L2Network.Scroll]: [],
    },
  },

  'PROXY-ADMIN-CHANGED': {
    name: (_: NameArgs) => `🚨 ${_.network}: Proxy admin changed`,
    severity: FindingSeverity.High,
    description: (contractAlias: string, address: string) => {
      return (_: EventArgs) => {
        return `Proxy admin for ${contractAlias}(${address}) ` +
        `was changed from ${_.previousAdmin} to ${_.newAdmin}` +
        `\n(detected by event)`
      }
    },
    event: 'event AdminChanged(address previousAdmin, address newAdmin)',
    contracts: {
      [L2Network.Default]: [ContractType.L2TokensBridge, ContractType.L2Wsteth],
      [L2Network.Scroll]: [],
    },
  },

  'PROXY-OSSIFIED': {
    name: (_: NameArgs) => `🚨 ${_.network}: Proxy ossified`,
    severity: FindingSeverity.High,
    description: (contractAlias: string, address: string) => {
      return (_: EventArgs) => {
        return `Proxy for ${contractAlias}(${address}) was ossified` +
        `\n(detected by event)`
      }
    },
    event: 'event ProxyOssified()',
    contracts: {
      [L2Network.Default]: [ContractType.L2TokensBridge, ContractType.L2Wsteth],
      [L2Network.Scroll]: [],
    },
  },

  'GOV-BRIDGE-EXEC-UPDATED': {
    name: (_: NameArgs) => `🚨 ${_.network} Gov Bridge: Ethereum Governance Executor Updated`,
    severity: FindingSeverity.High,
    description: (contractAlias: string, address: string) => {
      return (_: EventArgs) => {
        return `Ethereum Governance Executor was updated from ` +
        `${_.oldEthereumGovernanceExecutor} to ${_.newEthereumGovernanceExecutor}`
      }
    },
    event: 'event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)',
    contracts: {
      [L2Network.Default]: [ContractType.L2GovExecutor],
    },
  },
}

eventBasedAlertBundleSheet['PROXY-UPGRADED'].simulate = async (provider: JsonRpcProvider, address: string) => {
  const newImplementation = address // just reusing an address at hand for simplicity
  const contract = new Contract(address, MIN_PROXY_ABI, provider)
  const adminAddress = await contract.proxy__getAdmin()
  // console.debug({ adminAddress })
  await provider.send('hardhat_setBalance', [adminAddress, ethers.utils.parseEther('10').toHexString()])
  const signer = await provider.getSigner(adminAddress)

  const tx = await contract.connect(signer)["proxy__upgradeTo"](newImplementation)
  const receipt = await tx.wait()
  assert(receipt.logs.length > 0)
  // TODO: fix assert
  // assert(await contract['proxy__getImplementation']() === newImplementation)
}

eventBasedAlertBundleSheet['PROXY-ADMIN-CHANGED'].simulate = async (provider: JsonRpcProvider, address: string) => {
  const arbitraryAddress = '0xb4ef9590f724565caf344cc6AFB86Df266529CeE'
  const contract = new Contract(address, MIN_PROXY_ABI, provider)
  const adminAddress = await contract['proxy__getAdmin']()
  await provider.send('hardhat_setBalance', [adminAddress, ethers.utils.parseEther('10').toHexString()])
  const signer = await provider.getSigner(adminAddress)
  const tx = await contract.connect(signer)["proxy__changeAdmin"](arbitraryAddress)
  const receipt = await tx.wait()
  assert(receipt.logs.length > 0)
  assert(await contract['proxy__getAdmin']() === arbitraryAddress)
}

eventBasedAlertBundleSheet['PROXY-OSSIFIED'].simulate = async (provider: JsonRpcProvider, address: string) => {
  const contract = new Contract(address, MIN_PROXY_ABI, provider)
  const adminAddress = await contract['proxy__getAdmin']()
  await provider.send('hardhat_setBalance', [adminAddress, ethers.utils.parseEther('10').toHexString()])
  const signer = await provider.getSigner(adminAddress)
  const tx = await contract.connect(signer)["proxy__ossify"]()
  const receipt = await tx.wait()
  assert(receipt.logs.length > 0)
  assert(await contract['proxy__getIsOssified']())
}

eventBasedAlertBundleSheet['GOV-BRIDGE-EXEC-UPDATED'].simulate = async (provider: JsonRpcProvider, address: string) => {
  const arbitraryAddress = '0xb4ef9590f724565caf344cc6AFB86Df266529CeE'
  const contract = new Contract(address, MIN_GOV_EXECUTOR_ABI, provider)
  await provider.send('hardhat_setBalance', [address, ethers.utils.parseEther('10').toHexString()])
  const signer = await provider.getSigner(address)
  const tx = await contract.connect(signer)["updateEthereumGovernanceExecutor"](arbitraryAddress)
  const receipt = await tx.wait()
  assert(receipt.logs.length > 0)
  assert(await contract['getEthereumGovernanceExecutor']() === arbitraryAddress)
}


export function getEventBasedAlerts(networkName: string) {
  assert((Object.values(L2Network) as string[]).includes(networkName))
  const result: EventOfNotice[] = []
  for (const [alertId, params] of Object.entries(eventBasedAlertBundleSheet)) {

    const contractsAliases = params.contracts[networkName] || params.contracts[L2Network.Default]
    assert(contractsAliases !== undefined)

    for (const contractAlias of contractsAliases) {
      assert(contractsSheet[networkName])
      assert(contractsSheet[networkName][contractAlias])

      const contractAddress = formatAddress(contractsSheet[networkName][contractAlias])
      assert(contractAddress === contractAddress.toLowerCase())

      result.push({
        name: params.name({network: networkName}),
        address: contractAddress,
        event: params.event,
        alertId: alertId,
        description: params.description(contractAlias, contractAddress),
        severity: params.severity,
        type: FindingType.Info,
        uniqueKey: "", // TODO
        simulate: params.simulate,
      })
    }
  }
  return result
}