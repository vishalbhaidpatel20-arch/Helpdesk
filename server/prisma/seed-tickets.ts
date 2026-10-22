// Seeds 100 realistic, varied tickets (statuses, categories, senders, dates over the last 60 days)
// so sorting and filtering can be tried out in the UI. Dev data only.
// Usage: bun run --cwd server db:seed:tickets
// Idempotent: each ticket has a fixed messageId, so running it again adds nothing.
import 'dotenv/config'
import { TicketCategory, TicketStatus } from '../generated/enums'
import { prisma } from '../src/db'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed sample tickets in production')
}

const TOTAL = 100
const DAY = 24 * 60 * 60 * 1000

// Deterministic pseudo-random numbers, so the data set is the same every time
let seed = 20261021
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)]

const senders = [
  ['Emma Johnson', 'emma.johnson@gmail.com'],
  ['Liam Carter', 'liam.carter@outlook.com'],
  ['Olivia Martinez', 'olivia.martinez@brightpath.io'],
  ['Noah Patel', 'noah.patel@northwind.co'],
  ['Ava Nguyen', 'ava.nguyen@gmail.com'],
  ['Ethan Brooks', 'ethan.brooks@harborlogistics.com'],
  ['Sophia Rossi', 'sophia.rossi@studiorossi.it'],
  ['Mason Kim', 'mason.kim@yahoo.com'],
  ['Isabella Garcia', 'isabella.garcia@lumenhealth.org'],
  ['Lucas Fischer', 'lucas.fischer@fischer-bau.de'],
  ['Mia Thompson', 'mia.thompson@icloud.com'],
  ['Henry Walker', 'henry.walker@walkerandsons.com'],
  ['Charlotte Dubois', 'charlotte.dubois@atelier-dubois.fr'],
  ['Jack Anderson', 'jack.anderson@gmail.com'],
  ['Amelia Singh', 'amelia.singh@orbitlabs.dev'],
  ['Daniel Okafor', 'daniel.okafor@okaforgroup.ng'],
  ['Grace Lee', 'grace.lee@protonmail.com'],
  ['Samuel Wright', 'samuel.wright@wrightdesign.co.uk'],
  ['Hannah Müller', 'hannah.mueller@gmx.de'],
  ['Benjamin Cohen', 'ben.cohen@cohenlaw.com'],
  ['Zoe Alvarez', 'zoe.alvarez@sunriseacademy.edu'],
  ['Owen Murphy', 'owen.murphy@outlook.com'],
  ['Priya Sharma', 'priya.sharma@finlytics.in'],
  ['Leo Tanaka', 'leo.tanaka@tanaka-works.jp'],
  ['Chloe Bennett', 'chloe.bennett@gmail.com'],
  ['Mateo Silva', 'mateo.silva@silvaconsult.com.br'],
  ['Ruby Edwards', 'ruby.edwards@bloomcafe.com'],
  ['Victor Petrov', 'victor.petrov@petrovtech.eu'],
  ['Natalie Brown', 'natalie.brown@yahoo.com'],
  ['Omar Haddad', 'omar.haddad@haddadtrading.ae'],
] as const

type Params = { name: string; order: string; amount: string; plan: string }
type Template = { subject: string; body: (p: Params) => string }

const general: Template[] = [
  {
    subject: 'Do you offer discounts for nonprofits?',
    body: (p) =>
      `Hi team,\n\nI run a small nonprofit and we are considering the ${p.plan} plan for our volunteers. Do you offer any discounts for registered nonprofits, and if so what paperwork do you need?\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'How do I change the email address on my account?',
    body: (p) =>
      `Hello,\n\nI changed jobs and need to move my account to a new email address. I could not find the option in settings. Could you point me to it or do it for me?\n\nBest,\n${p.name}`,
  },
  {
    subject: 'What are your support hours?',
    body: (p) =>
      `Hi,\n\nCould you tell me when your support team is available? We are in a different time zone and want to plan our rollout week.\n\nRegards,\n${p.name}`,
  },
  {
    subject: 'Can I upgrade my plan mid-billing cycle?',
    body: (p) =>
      `Hello,\n\nWe are on the Starter plan and need more seats before the end of the month. If I upgrade to ${p.plan} today, how is the remaining time on my current plan handled?\n\n${p.name}`,
  },
  {
    subject: 'Is there an annual billing option?',
    body: (p) =>
      `Hi there,\n\nWe would prefer to pay once a year instead of monthly. Is annual billing available and is there a discount compared with monthly?\n\nThank you,\n${p.name}`,
  },
  {
    subject: 'Where can I find my past invoices?',
    body: (p) =>
      `Hello,\n\nMy accountant needs the invoices for the last six months. I looked under Billing but only see the latest one. Is there a way to download all of them?\n\nCheers,\n${p.name}`,
  },
  {
    subject: 'Do you have a mobile app?',
    body: (p) =>
      `Hi,\n\nMy team works mostly from phones in the field. Is there an iOS or Android app, or only the web version?\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'How do I add a teammate to my workspace?',
    body: (p) =>
      `Hello,\n\nI just invited a colleague but she did not get an email. Is there another way to add people, and is there a limit on seats on the ${p.plan} plan?\n\nBest regards,\n${p.name}`,
  },
  {
    subject: 'Question about exporting all my data',
    body: (p) =>
      `Hi,\n\nBefore we decide to renew I would like to know what export formats you support (CSV, JSON?) and whether the export includes attachments.\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'Is my data stored in the EU?',
    body: (p) =>
      `Hello,\n\nOur company policy requires customer data to stay in the EU. Can you confirm where your servers are located and whether you have a data processing agreement we can sign?\n\n${p.name}`,
  },
  {
    subject: 'Request for company details for our records',
    body: (p) =>
      `Hi,\n\nOur finance department needs your legal entity name, address and VAT number to add you as a vendor. Could you send them over?\n\nKind regards,\n${p.name}`,
  },
  {
    subject: 'Can I pause my subscription over the summer?',
    body: (p) =>
      `Hello,\n\nWe close the office for two months in summer. Is it possible to pause the subscription instead of cancelling and starting over in September?\n\nThank you,\n${p.name}`,
  },
]

const technical: Template[] = [
  {
    subject: "Can't log in after password reset",
    body: (p) =>
      `Hi,\n\nI reset my password this morning and the confirmation said it worked, but now I just get "Invalid credentials" every time. I tried two browsers and an incognito window.\n\n${p.name}`,
  },
  {
    subject: 'App crashes when uploading files over 50MB',
    body: (p) =>
      `Hello,\n\nEvery time I upload a video larger than about 50MB the page freezes and then shows a blank screen. Smaller files are fine. Chrome 126 on Windows 11.\n\nCan you take a look?\n${p.name}`,
  },
  {
    subject: 'Dashboard shows a blank page in Safari',
    body: (p) =>
      `Hi team,\n\nSince yesterday the dashboard loads as an empty white page in Safari 17 on my Mac. It works fine in Firefox. The console shows a "SyntaxError: Unexpected token" message.\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'API returns 500 on /v1/reports',
    body: (p) =>
      `Hello,\n\nOur nightly job calls GET /v1/reports?range=30d and has been getting HTTP 500 since about 02:00 UTC. Request id from the last failure: req_${p.order}. Nothing changed on our side.\n\n${p.name}`,
  },
  {
    subject: 'Two-factor codes are not arriving',
    body: (p) =>
      `Hi,\n\nI am locked out because the SMS verification codes never arrive. I have tried five times over the last hour. My number ends in 42. Can you reset my two-factor setup?\n\nRegards,\n${p.name}`,
  },
  {
    subject: 'Webhook deliveries failing since Tuesday',
    body: (p) =>
      `Hello,\n\nOur endpoint stopped receiving events from you on Tuesday afternoon. Our logs show no incoming requests at all. We did not change the URL (https://hooks.example.com/events). Is there an outage?\n\n${p.name}`,
  },
  {
    subject: 'CSV import is stuck at 90%',
    body: (p) =>
      `Hi,\n\nI am importing a contact list with about 12,000 rows and the progress bar has been stuck at 90% for over an hour. Should I wait or start again?\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'Notifications are delayed by several hours',
    body: (p) =>
      `Hello,\n\nEmail notifications for new comments arrive 3-4 hours late, which makes them useless for urgent work. It started about a week ago.\n\n${p.name}`,
  },
  {
    subject: 'SSO login loops back to the sign-in page',
    body: (p) =>
      `Hi team,\n\nWe configured SSO with Okta following your guide. After authenticating with Okta we are redirected back to the sign-in page instead of the dashboard. Only some users are affected.\n\nBest,\n${p.name}`,
  },
  {
    subject: 'Reports tab is very slow to load',
    body: (p) =>
      `Hello,\n\nThe reports tab takes over 30 seconds to open, even for a one-week range. Other pages are fine. We have around 40 users in the workspace.\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'Search returns nothing for exact matches',
    body: (p) =>
      `Hi,\n\nSearching for the exact title of a document I created yesterday returns no results, although I can open the document directly. Older documents are found normally.\n\n${p.name}`,
  },
  {
    subject: "Mobile app won't sync on Android 14",
    body: (p) =>
      `Hello,\n\nAfter updating my phone to Android 14 the app shows "Last synced: never" and my offline changes are not uploading. I reinstalled it but nothing changed.\n\nRegards,\n${p.name}`,
  },
]

const refund: Template[] = [
  {
    subject: 'Refund request: charged twice this month',
    body: (p) =>
      `Hi,\n\nI was charged ${p.amount} twice on the same day for my subscription (order ${p.order}). Please refund the duplicate payment.\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'Please refund my annual subscription',
    body: (p) =>
      `Hello,\n\nWe decided to go with a different tool and I would like to cancel and get a refund for the annual ${p.plan} plan we paid ${p.amount} for on order ${p.order}. We have barely used it.\n\n${p.name}`,
  },
  {
    subject: 'Cancelled within 14 days, requesting refund',
    body: (p) =>
      `Hi team,\n\nI signed up two weeks ago, realised it is not what we need and cancelled right away. The ${p.amount} charge (order ${p.order}) still went through. I would like it refunded under your 14-day policy.\n\n${p.name}`,
  },
  {
    subject: 'Accidental upgrade, need a refund',
    body: (p) =>
      `Hello,\n\nI clicked the upgrade button by mistake and was charged ${p.amount} for the ${p.plan} plan. I immediately downgraded again. Can you reverse the charge? Order ${p.order}.\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'Refund for unused seats',
    body: (p) =>
      `Hi,\n\nWe reduced our team from 12 to 7 people but were billed ${p.amount} for all 12 seats on invoice ${p.order}. Could you refund the difference?\n\nBest,\n${p.name}`,
  },
  {
    subject: 'Charged after I cancelled my account',
    body: (p) =>
      `Hello,\n\nI cancelled my account on the 3rd and received the confirmation email, yet I was charged ${p.amount} again today (order ${p.order}). Please refund it and confirm the account is closed.\n\n${p.name}`,
  },
  {
    subject: 'Billing error on my latest invoice',
    body: (p) =>
      `Hi,\n\nInvoice ${p.order} shows ${p.amount} but my plan costs less than half of that. It looks like an add-on I never activated was included. I would like a corrected invoice and a refund of the difference.\n\n${p.name}`,
  },
  {
    subject: 'Refund status update?',
    body: (p) =>
      `Hello,\n\nYou approved my refund of ${p.amount} (order ${p.order}) ten days ago but the money has not reached my card yet. Could you check what is going on?\n\nThanks,\n${p.name}`,
  },
  {
    subject: 'Refund due to service outage last week',
    body: (p) =>
      `Hi team,\n\nThe service was down for most of last Wednesday and we could not work. We would like a partial refund for the month (order ${p.order}, ${p.amount}). Happy to discuss a credit instead.\n\n${p.name}`,
  },
]

const groups: Record<TicketCategory, Template[]> = {
  [TicketCategory.GENERAL_QUESTION]: general,
  [TicketCategory.TECHNICAL_QUESTION]: technical,
  [TicketCategory.REFUND_REQUEST]: refund,
}

// Roughly 30% general, 40% technical, 30% refund requests
function pickCategory() {
  const r = rand()
  if (r < 0.3) return TicketCategory.GENERAL_QUESTION
  if (r < 0.7) return TicketCategory.TECHNICAL_QUESTION
  return TicketCategory.REFUND_REQUEST
}

// Older tickets are mostly closed or resolved, recent ones mostly open
function pickStatus(ageDays: number) {
  const r = rand()
  if (ageDays > 30) return r < 0.6 ? TicketStatus.CLOSED : r < 0.9 ? TicketStatus.RESOLVED : TicketStatus.OPEN
  if (ageDays > 7) return r < 0.4 ? TicketStatus.OPEN : r < 0.85 ? TicketStatus.RESOLVED : TicketStatus.CLOSED
  return r < 0.8 ? TicketStatus.OPEN : r < 0.95 ? TicketStatus.RESOLVED : TicketStatus.CLOSED
}

const plans = ['Starter', 'Team', 'Business', 'Enterprise']
const amounts = ['$19.00', '$29.00', '$49.00', '$79.00', '$149.00', '$290.00', '$588.00']

const now = Date.now()
const tickets = Array.from({ length: TOTAL }, (_, i) => {
  const [name, email] = pick(senders)
  const category = pickCategory()
  const template = pick(groups[category])
  // Spread over the last 60 days, with a different time of day for each
  const ageMs = rand() * 60 * DAY
  const ageDays = ageMs / DAY
  const createdAt = new Date(now - ageMs)
  const status = pickStatus(ageDays)
  const params: Params = {
    name: name.split(' ')[0],
    order: String(10000 + Math.floor(rand() * 89999)),
    amount: pick(amounts),
    plan: pick(plans),
  }
  // Fresh open tickets that nobody has classified yet have no category
  const unclassified = status === TicketStatus.OPEN && ageDays < 10 && rand() < 0.5
  return {
    subject: template.subject,
    body: template.body(params),
    senderName: name,
    senderEmail: email,
    messageId: `<seed-ticket-${String(i + 1).padStart(3, '0')}@seed.helpdesk.local>`,
    status,
    category: unclassified ? null : category,
    createdAt,
    // Handled tickets were last touched some hours or days after they arrived
    updatedAt:
      status === TicketStatus.OPEN
        ? createdAt
        : new Date(Math.min(now, createdAt.getTime() + (1 + rand() * 72) * 60 * 60 * 1000)),
  }
})

const { count } = await prisma.ticket.createMany({ data: tickets, skipDuplicates: true })

// Dashboard numbers need resolution data: handled tickets get a resolvedAt, and about a third of them were
// answered by the AI (a reply with no author). Runs on every seed so tickets seeded earlier are filled in too.
await prisma.$executeRaw`
  UPDATE "ticket" SET "resolvedAt" = "updatedAt"
  WHERE "messageId" LIKE '%@seed.helpdesk.local>' AND "status" IN ('RESOLVED', 'CLOSED') AND "resolvedAt" IS NULL`
await prisma.$executeRaw`
  INSERT INTO "reply" ("ticketId", "authorId", "body", "createdAt")
  SELECT t."id", NULL, 'Hi, thanks for reaching out. Based on our knowledge base, this should resolve your issue. Please reply if it does not.', t."resolvedAt"
  FROM "ticket" t
  WHERE t."messageId" LIKE '%@seed.helpdesk.local>' AND t."status" IN ('RESOLVED', 'CLOSED')
    AND t."id" % 3 = 0 AND NOT EXISTS (SELECT 1 FROM "reply" r WHERE r."ticketId" = t."id")`

const dbName = new URL(process.env.DATABASE_URL ?? 'postgresql://unknown/unknown').pathname.slice(1)
console.log(`Seeded ${count} new tickets into "${dbName}" (${TOTAL - count} already existed)`)

await prisma.$disconnect()
