"use client";

import { useActionState } from "react";
import { Bell, Check, CheckCheck, LoaderCircle } from "lucide-react";
import { markNotificationAction, type OperationState } from "@/app/operations/actions";
import { RegisterSection } from "@/components/ui/module-primitives";
import type { NotificationRow } from "@/lib/domain";

function ReadButton({ id }: { id: string }) {
  const [, action, pending] = useActionState(markNotificationAction, {} satisfies OperationState);
  return <form action={action}><input type="hidden" name="id" value={id} /><button className="inline-flex items-center gap-1 border border-stone-300 px-2 py-1.5 text-[11px] font-semibold hover:border-orange-400 disabled:opacity-50" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={13} /> : <Check size={13} />}อ่านแล้ว</button></form>;
}

export function NotificationsView({ notifications }: { notifications: NotificationRow[] }) {
  const [state, action, pending] = useActionState(markNotificationAction, {} satisfies OperationState);
  const unread = notifications.filter((item) => !item.read).length;
  return <div className="space-y-5"><section className="grid border border-stone-200 bg-white sm:grid-cols-[1fr_auto]"><div className="flex items-center gap-4 p-5"><Bell className="text-[#c9440b]" /><span><b className="block text-2xl">{unread}</b><small className="text-stone-500">การแจ้งเตือนที่ยังไม่อ่าน</small></span></div><form action={action} className="flex items-center border-t border-stone-200 p-4 sm:border-t-0 sm:border-l"><input type="hidden" name="all" value="true" /><button className="inline-flex w-full items-center justify-center gap-2 border border-stone-300 px-4 py-2 text-xs font-semibold hover:border-orange-400 disabled:opacity-50" disabled={pending || unread === 0}>{pending ? <LoaderCircle className="animate-spin" size={15} /> : <CheckCheck size={15} />}อ่านทั้งหมดแล้ว</button></form></section>{state.message ? <p className={`border px-4 py-3 text-xs ${state.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{state.message}</p> : null}<RegisterSection title="ศูนย์การแจ้งเตือน" aside={<span className="text-xs text-stone-500">ล่าสุด {notifications.length} รายการ</span>}><ul className="divide-y divide-stone-200">{notifications.map((item) => <li className={`grid gap-3 p-4 sm:grid-cols-[32px_1fr_auto] sm:items-center ${item.read ? "bg-white" : "bg-[#fff7f0]"}`} key={item.id}><span className={`grid size-8 place-items-center rounded-full ${item.read ? "bg-stone-100 text-stone-500" : "bg-orange-100 text-[#c9440b]"}`}><Bell size={15} /></span><span><b className="block text-sm">{item.title}</b><span className="mt-1 block text-xs leading-5 text-stone-600">{item.body}</span><small className="mt-1 block text-[10px] text-stone-500">{item.createdAt}</small></span>{!item.read ? <ReadButton id={item.id} /> : <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><Check size={13} />อ่านแล้ว</span>}</li>)}{notifications.length === 0 ? <li className="p-10 text-center text-sm text-stone-500">ยังไม่มีการแจ้งเตือน</li> : null}</ul></RegisterSection></div>;
}
