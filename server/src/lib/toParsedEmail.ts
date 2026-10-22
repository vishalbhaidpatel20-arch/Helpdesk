import type { AddressObject, ParsedMail } from 'mailparser'
import type { EmailAddress, ParsedEmail } from './handleIncomingEmail'

// To and Cc can appear more than once, which mailparser returns as an array
function flattenAddresses(field: AddressObject | AddressObject[] | undefined): EmailAddress[] {
  return [field ?? []]
    .flat()
    .flatMap((group) => group.value)
    .filter((entry) => entry.address)
    .map((entry) => ({ name: entry.name, address: entry.address! }))
}

export function toParsedEmail(mail: ParsedMail): ParsedEmail {
  return {
    from: flattenAddresses(mail.from),
    to: flattenAddresses(mail.to),
    cc: flattenAddresses(mail.cc),
    subject: mail.subject,
    date: mail.date,
    messageId: mail.messageId,
    text: mail.text,
    // mailparser uses false when there is no HTML part
    html: mail.html || undefined,
    attachments: mail.attachments.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      content: attachment.content,
    })),
  }
}
