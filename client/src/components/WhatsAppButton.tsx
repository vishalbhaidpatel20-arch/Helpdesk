import { MessageCircleIcon, PhoneIcon } from 'lucide-react'

// Optional WhatsApp number in international format (digits only, e.g. 919876543210). Without it the button still opens
// WhatsApp with the message prefilled, and the visitor picks who to send it to.
const number = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')
const message = 'Hi Helpdesk, I have a question.'
const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`

// Floating green chat button with an unread badge, fixed to the bottom right. It sits above the phone bottom bar and
// the desktop footer.
export default function WhatsAppButton() {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-24 z-20 flex size-16 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition-transform hover:scale-110 sm:right-8 sm:bottom-28"
    >
      <span className="relative flex items-center justify-center">
        <MessageCircleIcon className="size-9" aria-hidden />
        <PhoneIcon className="absolute size-4 fill-current" aria-hidden />
      </span>
      <span
        aria-hidden
        className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold"
      >
        1
      </span>
    </a>
  )
}
