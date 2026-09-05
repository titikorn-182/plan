import { AlertTriangle, DatabaseZap } from "lucide-react";

export function DataError({ message }: { message: string }) {
  return (
    <section className="border border-orange-300 bg-orange-50 p-5" role="alert">
      <div className="flex items-start gap-3">
        <DatabaseZap className="mt-0.5 shrink-0 text-[#c9440b]" size={20} />
        <div>
          <h2 className="text-sm font-bold">ยังอ่านข้อมูลจาก Supabase ไม่สำเร็จ</h2>
          <p className="mt-1 text-xs leading-5 text-stone-600">{message}</p>
          <p className="mt-2 text-xs font-semibold text-[#9a3412]">
            ตรวจว่าได้รัน migration และ seed ในโฟลเดอร์ supabase แล้ว
          </p>
        </div>
      </div>
    </section>
  );
}

export function EmptyData({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-44 place-items-center p-6 text-center">
      <div>
        <AlertTriangle className="mx-auto text-stone-400" size={22} />
        <b className="mt-3 block text-sm">{title}</b>
        <p className="mt-1 text-xs text-stone-500">{detail}</p>
      </div>
    </div>
  );
}
