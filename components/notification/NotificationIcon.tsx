import { Bell, Building2, CalendarClock, CreditCard, FileSignature, KeyRound, MessageCircle, Newspaper, ShieldCheck } from "lucide-react";
import type { NotificationCategory } from "@/types/notification.type";

const icons = {
  SYSTEM: Bell,
  NEWS: Newspaper,
  ACCOUNT: ShieldCheck,
  LISTING: Building2,
  APPOINTMENT: CalendarClock,
  RENTAL_REQUEST: KeyRound,
  CONTRACT: FileSignature,
  PAYMENT: CreditCard,
  CHAT: MessageCircle,
} satisfies Record<NotificationCategory, typeof Bell>;

export default function NotificationIcon({ category }: { category: NotificationCategory }) {
  const Icon = Object.hasOwn(icons, category) ? icons[category] : Bell;
  return <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />;
}
