import { ISpenderInfo } from './interfaces';


export function etherscanLink(address: string): string {
    return `https://etherscan.io/address/${address.toLowerCase()}`
}

export function makeSummary(spenders:Map<string, ISpenderInfo>) {
    let summary = "[Spenders summary]\n"
    spenders.forEach((spenderInfo:ISpenderInfo, spenderAddress: string) => {
        summary += `Spender: ${spenderAddress}\n`
        spenderInfo.approvers.forEach((approvers: Set<string>, token:string) => {
            summary += ` Token: ${token}\n`
            summary += ` Approvers: ${Array.from(approvers).join(", ")}\n`
        })
    })
}