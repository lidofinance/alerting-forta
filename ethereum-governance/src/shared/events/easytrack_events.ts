import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { etherscanAddress } from '../string'
import { EASY_TRACK_ADDRESS, REWARD_PROGRAMS_REGISTRY_ADDRESS, EVM_SCRIPT_EXECUTOR_ADDRESS } from 'constants/easy-track'
import { Result } from '@ethersproject/abi/lib'

export const MOTION_CREATED_EVENT = `
    event MotionCreated(
        uint256 indexed _motionId,
        address _creator,
        address indexed _evmScriptFactory,
        bytes _evmScriptCallData,
        bytes _evmScript
    )
`

export const EASY_TRACK_EVENTS: EventOfNotice[] = [
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event Paused(address account)',
    alertId: 'EASY-TRACK-PAUSED',
    name: '🚨 EasyTrack: EasyTrack contract was paused',
    description: (args: Result) => `EasyTrack contract was paused by ${etherscanAddress(args.account)}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Suspicious,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event Unpaused(address account)',
    alertId: 'EASY-TRACK-UNPAUSED',
    name: '✅ EasyTrack: EasyTrack contract was unpaused',
    description: (args: Result) => `EasyTrack contract was unpaused by ${etherscanAddress(args.account)}`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'EASY-TRACK-ROLE-GRANTED',
    name: '🚨 EasyTrack: Role was granted on EasyTrack contract',
    description: (args: Result) =>
      `Role ${args.role} was granted to ${etherscanAddress(
        args.account,
      )} on EasyTrack contract by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'EASY-TRACK-ROLE-REVOKED',
    name: '🚨 EasyTrack: Role was revoked on EasyTrack contract',
    description: (args: Result) =>
      `Role ${args.role} was revoked from ${etherscanAddress(
        args.account,
      )} on EasyTrack contract by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event MotionEnacted(uint256 indexed _motionId)',
    alertId: 'EASY-TRACK-MOTION-ENACTED',
    name: '✅ EasyTrack: Motion executed successfully 🎉',
    description: (args: Result) => `EasyTrack motion ${args._motionId} was enacted`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      'event MotionObjected(uint256 indexed _motionId, address indexed _objector, uint256 _weight, uint256 _newObjectionsAmount, uint256 _newObjectionsAmountPct)',
    alertId: 'EASY-TRACK-MOTION-OBJECTED',
    name: 'ℹ️ EasyTrack: Motion objected',
    description: (args: Result) =>
      `EasyTrack motion ${args._motionId} was objected by ${etherscanAddress(args._objector)}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event MotionRejected(uint256 indexed _motionId)',
    alertId: 'EASY-TRACK-MOTION-REJECTED',
    name: '❌ EasyTrack: Motion rejected',
    description: (args: Result) => `EasyTrack motion ${args._motionId} was rejected`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: 'event MotionCanceled(uint256 indexed _motionId)',
    alertId: 'EASY-TRACK-MOTION-CANCELED',
    name: '❌ EasyTrack: Motion canceled',
    description: (args: Result) => `EasyTrack motion ${args._motionId} was canceled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event: 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'REWARD-PROGRAMS-REGISTRY-ROLE-GRANTED',
    name: '🚨 Reward Programs: Role was granted on RewardProgramsRegistry',
    description: (args: Result) =>
      `Role ${args.role} was granted by ${etherscanAddress(
        args.account,
      )} on RewardProgramsRegistry by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event: 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    alertId: 'REWARD-PROGRAMS-REGISTRY-ROLE-REVOKED',
    name: '🚨 Reward Programs: Role was revoked on RewardProgramsRegistry',
    description: (args: Result) =>
      `Role ${args.role} was revoked from ${etherscanAddress(
        args.account,
      )} on RewardProgramsRegistry by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event: 'event EasyTrackChanged(address indexed _previousEasyTrack, address indexed _newEasyTrack)',
    alertId: 'EVM-SCRIPT-EXECUTOR-EASY-TRACK-CHANGED',
    name: "🚨 EasyTrack: EVMScriptExecutor's EasyTrack address changed",
    description: (args: Result) =>
      `EVMScriptExecutor's EasyTrack address changed from ${etherscanAddress(
        args._previousEasyTrack,
      )} to ${etherscanAddress(args._newEasyTrack)}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
    alertId: 'EVM-SCRIPT-EXECUTOR-OWNERSHIP-TRANSFERRED',
    name: "🚨 EasyTrack: EVMScriptExecutor's ownership transferred",
    description: (args: Result) =>
      `EVMScriptExecutor's ownership transferred from ${etherscanAddress(
        args.previousOwner,
      )} to ${etherscanAddress(args.newOwner)}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
]
