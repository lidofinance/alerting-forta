import path from 'path'

export interface VersionJSON {
    desc: string
    commitHash: string
    commitHashShort: string
    commitMsg: string
    commitMsgShort: string
    isWdClean: boolean
}

export default readVersion(path.join(__dirname, '..', '..', 'version.json'))

function readVersion(versionFilePath: string): VersionJSON {
    try {
        return require(versionFilePath)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        return {
            desc: 'unknown',
            commitHash: 'unknown',
            commitHashShort: 'unknown',
            commitMsg: 'unknown',
            commitMsgShort: 'unknown',
            isWdClean: false,
        }
    }
}
