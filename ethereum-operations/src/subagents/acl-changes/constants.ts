export const NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL = 24 * 60 * 60; // 24h
export const NEW_OWNER_IS_EOA_REPORT_INTERVAL = 60 * 60; // 1h

export const LIDO_ARAGON_ACL_ADDRESS =
    "0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb";

export const SET_PERMISSION_EVENT =
    "event SetPermission(address indexed entity, address indexed app, bytes32 indexed role, bool allowed)";

export const SET_PERMISSION_PARAMS_EVENT =
    "event SetPermissionParams (address indexed entity, address indexed app, bytes32 indexed role, bytes32 paramsHash)";

export const CHANGE_PERMISSION_MANAGER_EVENT =
    "event ChangePermissionManager(address indexed app, bytes32 indexed role, address indexed manager)";

export const LIDO_APPS = new Map([
    ["0xb8ffc3cd6e7cf5a098a1c92f48009765b24088dc", "Lido DAO"],
    ["0x5a98fcbea516cf06857215779fd812ca3bef1b32", "LDO token"],
    ["0x2e59a20f205bb85a89c53f1936454680651e618e", "Aragon Voting"],
    ["0xf73a1260d222f447210581ddf212d915c09a3249", "Aragon Token Manager"],
    ["0xb9e5cbb9ca5b0d659238807e84d0176930753d86", "Aragon Finance"],
    ["0x3e40d73eb977dc6a537af587d48316fee66e9c8c", "Aragon Agent"],
    ["0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb", "Aragon ACL"],
    ["0xf5dc67e54fc96f993cd06073f71ca732c1e654b1", "Lido App Repo"],
    ["0xf9339de629973c60c4d2b76749c81e6f40960e3a", "Lido Oracle Repo"],
    ["0x0d97e876ad14db2b183cfeeb8aa1a5c788eb1831", "NO registry Repo"],
    ["0x4ee3118e3858e8d7164a634825bfe0f73d99c792", "Voting Repo"],
    ["0xfe5986e06210ac1ecc1adcafc0cc7f8d63b3f977", "EVMScriptExecutor"],
    ["0x710b3303fb508a84f10793c1106e32be873c24cd", "Deposit Security module"],
    ["0x55032650b14df07b85bf18a3a3ec8e0af2e028d5", "Node Operators registry"],
    ["0x442af784a788a5bd6f42a01ebe9f287a871243fb", "Oracle"],
    ["0xae7ab96520de3a18e5e111b5eaab095312d7fe84", "stETH token"],
    ["0xa9b2f5ce3aae7374a62313473a74c98baa7fa70e", "LDO purchase executor"],
    ["0xb280e33812c0b09353180e92e27b8ad399b07f26", "SelfOwnedStETHBurner"],
]);

export const ORDINARY_ENTITIES = new Map([
    ["0x2e59a20f205bb85a89c53f1936454680651e618e", "Aragon Voting"],
    ["0x3e40d73eb977dc6a537af587d48316fee66e9c8c", "Aragon Agent"],
]);

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [
    "0x2e59A20f205bB85a89C53f1936454680651E618e",
    "0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c",
    // multisigs
    "0x73b047fe6337183A454c5217241D780a932777bD",
    "0x3cd9F71F80AB08ea5a7Dca348B5e94BC595f26A0",
];

// i.e. keccak256("APP_MANAGER_ROLE")
export const LIDO_ROLES = new Map([
    [
        "0xb6d92708f3d4817afc106147d969e229ced5c46e65e0a5002a0d391287762bd0",
        "APP MANAGER ROLE",
    ],
    [
        "0x068ca51c9d69625c7add396c98ca4f3b27d894c3b973051ad3ee53017d7094ea",
        "UNSAFELY MODIFY VOTE TIME ROLE",
    ],
    [
        "0xad15e7261800b4bb73f1b69d3864565ffb1fd00cb93cf14fe48da8f1f2149f39",
        "MODIFY QUORUM ROLE",
    ],
    [
        "0xda3972983e62bdf826c4b807c4c9c2b8a941e1f83dfa76d53d6aeac11e1be650",
        "MODIFY SUPPORT ROLE",
    ],
    [
        "0xe7dcd7275292e064d090fbc5f3bd7995be23b502c1fed5cd94cfddbbdcd32bbc",
        "CREATE VOTES ROLE",
    ],
    [
        "0x2406f1e99f79cea012fb88c5c36566feaeefee0f4b98d3a376b49310222b53c4",
        "ISSUE ROLE",
    ],
    [
        "0xf5a08927c847d7a29dc35e105208dbde5ce951392105d712761cc5d17440e2ff",
        "ASSIGN ROLE",
    ],
    [
        "0xe97b137254058bd94f28d2f3eb79e2d34074ffb488d042e3bc958e0a57d2fa22",
        "BURN ROLE",
    ],
    [
        "0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686",
        "MINT ROLE",
    ],
    [
        "0x95ffc68daedf1eb334cfcd22ee24a5eeb5a8e58aa40679f2ad247a84140f8d6e",
        "REVOKE VESTINGS ROLE",
    ],
    [
        "0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc",
        "CREATE PAYMENTS ROLE",
    ],
    [
        "0xd35e458bacdd5343c2f050f574554b2f417a8ea38d6a9a65ce2225dbe8bb9a9d",
        "CHANGE PERIOD ROLE",
    ],
    [
        "0xd79730e82bfef7d2f9639b9d10bf37ebb662b22ae2211502a00bdf7b2cc3a23a",
        "CHANGE BUDGETS ROLE",
    ],
    [
        "0x563165d3eae48bcb0a092543ca070d989169c98357e9a1b324ec5da44bab75fd",
        "EXECUTE PAYMENTS ROLE",
    ],
    [
        "0x30597dd103acfaef0649675953d9cb22faadab7e9d9ed57acc1c429d04b80777",
        "MANAGE PAYMENTS ROLE",
    ],
    [
        "0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc",
        "CREATE PAYMENTS ROLE",
    ],
    [
        "0x6eb2a499556bfa2872f5aa15812b956cc4a71b4d64eb3553f7073c7e41415aaa",
        "ADD PROTECTED TOKEN ROLE",
    ],
    [
        "0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c",
        "TRANSFER ROLE",
    ],
    [
        "0xb421f7ad7646747f3051c50c0b8e2377839296cd4973e27f63821d73e390338f",
        "RUN SCRIPT ROLE",
    ],
    [
        "0x0a1ad7b87f5846153c6d5a1f761d71c7d0cfd122384f56066cd33239b7933694",
        "SAFE EXECUTE ROLE",
    ],
    [
        "0x71eee93d500f6f065e38b27d242a756466a00a52a1dbcd6b4260f01a8640402a",
        "REMOVE PROTECTED TOKEN ROLE",
    ],
    [
        "0x23ce341656c3f14df6692eebd4757791e33662b7dcf9970c8308303da5472b7c",
        "DESIGNATE SIGNER ROLE",
    ],
    [
        "0xcebf517aa4440d1d125e0355aae64401211d0848a23c02cc5d29a14822580ba4",
        "EXECUTE ROLE",
    ],
    [
        "0x0b719b33c83b8e5d300c521cb8b54ae9bd933996a14bef8c2f4e0285d2d2400a",
        "CREATE PERMISSIONS ROLE",
    ],
    [
        "0x1f56cfecd3595a2e6cc1a7e6cb0b20df84cdbd92eff2fee554e70e4e45a9a7d8",
        "CREATE VERSION ROLE",
    ],
    [
        "0xbf4b1c236312ab76e456c7a8cca624bd2f86c74a4f8e09b3a26d60b1ce492183",
        "SET NODE OPERATOR ADDRESS ROLE",
    ],
    [
        "0x58412970477f41493548d908d4307dfca38391d6bc001d56ffef86bd4f4a72e8",
        "SET NODE OPERATOR NAME ROLE",
    ],
    [
        "0xe9367af2d321a2fc8d9c8f1e67f0fc1e2adf2f9844fb89ffa212619c713685b2",
        "ADD NODE OPERATOR ROLE",
    ],
    [
        "0x18ad851afd4930ecc8d243c8869bd91583210624f3f1572e99ee8b450315c80f",
        "REPORT STOPPED VALIDATORS ROLE",
    ],
    [
        "0xd856e115ac9805c675a51831fa7d8ce01c333d666b0e34b3fc29833b7c68936a",
        "SET NODE OPERATOR ACTIVE ROLE",
    ],
    [
        "0x07b39e0faf2521001ae4e58cb9ffd3840a63e205d288dc9c93c3774f0d794754",
        "SET NODE OPERATOR LIMIT ROLE",
    ],
    [
        "0xa5ffa9f45fa52c446078e834e1914561bd9c2ab1e833572d62af775da092ccbc",
        "MANAGE QUORUM",
    ],
    [
        "0xe22a455f1bfbaf705ac3e891a64e156da92cb0b42cfc389158e6e82bd57f37be",
        "SET BEACON REPORT RECEIVER",
    ],
    [
        "0xbf6336045918ae0015f4cdb3441a2fdbfaa4bcde6558c8692aac7f56c69fb067",
        "MANAGE MEMBERS",
    ],
    [
        "0x16a273d48baf8111397316e6d961e6836913acb23b181e6c5fb35ec0bd2648fc",
        "SET BEACON SPEC",
    ],
    [
        "0x44adaee26c92733e57241cb0b26ffaa2d182ed7120ba3ecd7e0dce3635c01dc1",
        "SET REPORT BOUNDARIES",
    ],
    [
        "0x2fc10cc8ae19568712f7a176fb4978616a610650813c9d05326c34abb62749c7",
        "RESUME ROLE",
    ],
    [
        "0x84ea57490227bc2be925c684e2a367071d69890b629590198f4125a018eb1de8",
        "STAKING PAUSE ROLE",
    ],
    [
        "0xa42eee1333c0758ba72be38e728b6dadb32ea767de5b4ddbaea1dae85b1b051f",
        "STAKING CONTROL ROLE",
    ],
    [
        "0xeb7bfce47948ec1179e2358171d5ee7c821994c911519349b95313b685109031",
        "MANAGE PROTOCOL CONTRACTS ROLE",
    ],
    [
        "0x9d68ad53a92b6f44b2e8fb18d211bf8ccb1114f6fafd56aa364515dfdf23c44f",
        "SET EL REWARDS VAULT ROLE",
    ],
    [
        "0xca7d176c2da2028ed06be7e3b9457e6419ae0744dc311989e9b29f6a1ceb1003",
        "SET EL REWARDS WITHDRAWAL LIMIT ROLE",
    ],
    [
        "0x2561bf26f818282a3be40719542054d2173eb0d38539e8a8d3cff22f29fd2384",
        "DEPOSIT ROLE",
    ],
]);

interface IOwnable {
    name: string;
    ownershipMethod: string;
}

// List of contracts to monitor for owner
export const OWNABLE_CONTRACTS = new Map<string, IOwnable>([
    [
        "0x710B3303fB508a84F10793c1106e32bE873C24cd",
        {
            name: "Deposit Security module",
            ownershipMethod: "getOwner",
        },
    ],
    [
        "0x753D5167C31fBEB5b49624314d74A957Eb271709",
        {
            name: "Curve Liquidity Farming Manager",
            ownershipMethod: "owner",
        },
    ],
    [
        "0x6140182B2536AE7B6Cfcfb2d2bAB0f6Fe0D7b58E",
        {
            name: "ARCx Manager",
            ownershipMethod: "owner",
        },
    ],
    [
        "0xE5576eB1dD4aA524D67Cf9a32C8742540252b6F4",
        {
            name: "SushiSwap LP Manager",
            ownershipMethod: "owner",
        },
    ],
    [
        "0x75ff3dd673Ef9fC459A52E1054db5dF2A1101212",
        {
            name: "SushiSwap LP Reward",
            ownershipMethod: "owner",
        },
    ],
    [
        "0x1220ccCDc9BBA5CF626a84586C74D6f940932342",
        {
            name: "Balancer LP v2 Manager",
            ownershipMethod: "owner",
        },
    ],
    [
        "0x86F6c353A0965eB069cD7f4f91C1aFEf8C725551",
        {
            name: "Balancer LP v3 Manager",
            ownershipMethod: "owner",
        },
    ],
    [
        "0xf5436129Cf9d8fa2a1cb6e591347155276550635",
        {
            name: "1inch LP Reward Manager",
            ownershipMethod: "owner",
        },
    ],
    [
        "0xA2F987A546D4CD1c607Ee8141276876C26b72Bdf",
        {
            name: "AnchorVault",
            ownershipMethod: "admin",
        },
    ],
    [
        "0xFE5986E06210aC1eCC1aDCafc0cc7f8D63B3F977",
        {
            name: "Easy Track EVMScriptExecutor",
            ownershipMethod: "owner",
        },
    ],
]);
