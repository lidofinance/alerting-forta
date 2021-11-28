import {
  FindingType,
  FindingSeverity,
} from 'forta-agent'
import BigNumber from 'bignumber.js'
import { ethers } from 'forta-agent'


export const ANCHOR_VAULT_ADDRESS = '0xa2f987a546d4cd1c607ee8141276876c26b72bdf'
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT = 'event RewardsCollected(uint256 steth_amount, uint256 ust_amount)'
export const ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT = 'event SoldStethToUST(uint256 steth_amount, uint256 eth_amount, uint256 usdc_amount, uint256 ust_amount, uint256 steth_eth_price, uint256 eth_usdc_price, uint256 usdc_ust_price)'

export const LDO_TOKEN_ADDRESS = '0x5a98fcbea516cf06857215779fd812ca3bef1b32'
export const LIDO_ORACLE_ADDRESS = '0x442af784a788a5bd6f42a01ebe9f287a871243fb'
export const LIDO_ORACLE_COMPLETED_EVENT = 'event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)'

// export const SUSHI_MANAGER_ADDRESS = '0xe5576eb1dd4aa524d67cf9a32c8742540252b6f4'
// export const SUSHI_REWARDS_ADDRESS = '0x75ff3dd673ef9fc459a52e1054db5df2a1101212'


// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_DELAY = 24 * 60 * 60 + 10 * 60 // 24h 10m

// max delay between oracle report and bETH rewards sell
export const MAX_BETH_REWARDS_SELL_DELAY = 60 * 5 // 5 minutes

// max delay of receipt of funds for Sushi rewards contract
export const MAX_SUSHI_REWARDS_RECEIPT_DELAY = 60 * 10 // 10 minutes

// max delay of receipt of funds for Sushi rewards contract
export const MIN_SUSHI_MANAGER_FUNDS_RECEIPT_MARGIN = 3 * 24 * 60 * 60 // TODO

export const POOL_REWARDS_STILL_NOT_PROLONGED_ALERT_PERIOD = 10 * 60 // 10 mins

// ==== DEBUG ====
const midnightOfNov27 = 1637960400
const baseTime = midnightOfNov27 + 24*60*60 + 17 * 60*60 + 17 * 60

const sushiPeriodEnd = 1639648015
const sushiFirstAlertPeriod = sushiPeriodEnd - baseTime - (0 * 60*60 + 1 * 60)

const curvePeriodEnd = 1639189742
const curveFirstAlertPeriod = curvePeriodEnd - baseTime - (0 * 60*60 + 2 * 60)

const balancerPeriodEnd = 1638748800
const balancerFirstAlertPeriod = balancerPeriodEnd - baseTime - (0 * 60*60 + 2 * 60)

const oneInchPeriodEnd = 1640328279
const oneInchFirstAlertPeriod = oneInchPeriodEnd - baseTime - (0 * 60*60 + 1 * 60 + 20)




export const REWARDS_ALERT_PARAMETERS = {
    Sushi: {
        managerAddress: '0xe5576eb1dd4aa524d67cf9a32c8742540252b6f4',
        rewardsAddress: '0x75ff3dd673ef9fc459a52e1054db5df2a1101212',
        alerts: [
            {
                beforehandPeriod: sushiFirstAlertPeriod,
                minimumLdo: null,
                description: `Sushi rewards period expires in 10 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: sushiFirstAlertPeriod - 65,
                minimumLdo: null,
                description: `Sushi rewards period expires in 5 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: sushiFirstAlertPeriod - 90,
                minimumLdo: '0',
                description: `Sushi rewards period expires in 3 days`,
                severity: FindingSeverity.High,
            },
            {
                beforehandPeriod: sushiFirstAlertPeriod - 90 - 12 - 30,
                minimumLdo: '10000',
                description: `Sushi rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
                severity: FindingSeverity.Info,
            },
        ]
    },
    Curve: {
        managerAddress: '0x753D5167C31fBEB5b49624314d74A957Eb271709',
        rewardsAddress: '0x99ac10631F69C753DDb595D074422a0922D9056B',
        alerts: [
            {
                beforehandPeriod: curveFirstAlertPeriod,
                minimumLdo: null,
                description: `Curve rewards period expires in 10 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: curveFirstAlertPeriod - 100,
                minimumLdo: null,
                description: `Curve rewards period expires in 5 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: curveFirstAlertPeriod - 140,
                minimumLdo: '0',
                description: `Curve rewards period expires in 3 days`,
                severity: FindingSeverity.High,
            },
            {
                beforehandPeriod: curveFirstAlertPeriod - 200,
                minimumLdo: '10000',
                description: `Curve rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
                severity: FindingSeverity.Info,
            },
        ],
    },
    Balancer: {
        managerAddress: '0x1dD909cDdF3dbe61aC08112dC0Fdf2Ab949f79D8',
        rewardsAddress: '',
        alerts: [
            {
                beforehandPeriod: balancerFirstAlertPeriod,
                minimumLdo: null,
                description: `Balancer rewards period expires in 10 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: balancerFirstAlertPeriod - 100,
                minimumLdo: null,
                description: `Balancer rewards period expires in 5 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: balancerFirstAlertPeriod - 140,
                minimumLdo: '0',
                description: `Balancer rewards period expires in 3 days`,
                severity: FindingSeverity.High,
            },
            {
                beforehandPeriod: balancerFirstAlertPeriod - 200,
                minimumLdo: '10000',
                description: `Balancer rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
                severity: FindingSeverity.Info,
            },
        ]
    },
    OneInch: {
        managerAddress: '0xf5436129Cf9d8fa2a1cb6e591347155276550635',
        rewardsAddress: '',
        alerts: [
            {
                beforehandPeriod: oneInchFirstAlertPeriod,
                minimumLdo: null,
                description: `OneInch rewards period expires in 10 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: oneInchFirstAlertPeriod - 100,
                minimumLdo: null,
                description: `OneInch rewards period expires in 5 days`,
                severity: FindingSeverity.Info,
            },
            {
                beforehandPeriod: oneInchFirstAlertPeriod - 140,
                minimumLdo: '0',
                description: `OneInch rewards period expires in 3 days`,
                severity: FindingSeverity.High,
            },
            {
                beforehandPeriod: oneInchFirstAlertPeriod - 200,
                minimumLdo: '10000',
                description: `OneInch rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
                severity: FindingSeverity.Info,
            },
        ]
    }
}