import 'dotenv/config'

export class Config {
  public readonly appName: string
  public readonly nodeEnv: string
  public readonly instance: string
  public readonly ethereumRpcUrl: string
  public readonly dataProvider: string

  public readonly grpcPort: number
  public readonly httpPort: number
  public readonly logFormat: string
  public readonly logLevel: string

  public readonly chainId: number
  public readonly promPrefix: string
  public readonly etherscanKey: string
  public readonly useFortaProvider: boolean

  constructor() {
    this.appName = process.env.APP_NAME || 'csm-alerts'
    this.nodeEnv = process.env.NODE_ENV || 'production'
    this.instance = process.env.INSTANCE || 'forta'

    this.grpcPort = parseInt(process.env.AGENT_GRPC_PORT!, 10) || 50051
    this.httpPort = parseInt(process.env.HTTP_PORT!, 10) || 3000
    this.logFormat = process.env.LOG_FORMAT || 'simple'
    this.logLevel = process.env.LOG_LEVEL || 'info'

    this.chainId = parseInt(process.env.FORTA_CHAIN_ID!, 10) || 17000
    this.ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://holesky.drpc.org'

    this.promPrefix = this.appName.replace('-', '_') + '_'
    this.etherscanKey =
      process.env.ETHERSCAN_KEY! ||
      Buffer.from('SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==', 'base64').toString('utf-8')

    // this.useFortaProvider = JSON.parse(process.env.USE_FORTA_RPC_URL!)
    this.useFortaProvider = process.env.USE_FORTA_RPC_URL === 'true'

    const urlRegex = /^(?:https?:\/\/)?(?:www\.)?([^/\n]+)/

    this.dataProvider = ''
    const match = this.ethereumRpcUrl.match(urlRegex)
    if (match) {
      this.dataProvider = match[1]
    }
  }
}
