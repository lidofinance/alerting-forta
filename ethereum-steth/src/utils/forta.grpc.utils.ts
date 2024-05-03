import * as alert_pb from '../generated/proto/alert_pb'
import { Finding } from 'forta-agent'

export function fortaFindingToGrpc(finding: Finding): alert_pb.Finding {
  const out: alert_pb.Finding = new alert_pb.Finding()

  out.setProtocol(finding.protocol)
  out.setSeverity(Number(finding.severity))
  out.setType(Number(finding.type))
  out.setAlertid(finding.alertId)
  out.setName(finding.name)
  out.setDescription(finding.description)
  out.setPrivate(false)
  out.setAddressesList(finding.addresses)
  out.setUniquekey(finding.uniqueKey)
  out.setTimestamp(finding.timestamp.toString())

  const metadata = out.getMetadataMap()
  for (const key in finding.metadata) {
    metadata.set(key, finding.metadata[key])
  }

  return out
}
