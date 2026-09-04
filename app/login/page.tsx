import { CheckCircle2, LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/schemas";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="grid min-h-screen bg-[#f7f5f2] lg:grid-cols-[minmax(420px,0.85fr)_1.15fr]">
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3"><span className="grid size-11 place-items-center bg-[#cf430c] text-white"><LockKeyhole size={21} /></span><span><b className="block text-xl">ระบบบริหารแผน</b><small className="text-stone-500">Planning & Budget Management</small></span></div>
          <h1 className="text-3xl font-bold tracking-[-0.03em]">เข้าสู่ระบบเพื่อดำเนินงาน</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">ใช้อีเมลสถาบันและรหัสผ่านของคุณ ระบบจะแสดงข้อมูลตามบทบาทและหน่วยงานที่ได้รับสิทธิ์</p>
          {error ? <p className="mt-5 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{error === "inactive" ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" : "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบหรือขอลิงก์ใหม่"}</p> : null}
          <LoginForm nextPath={safeNextPath(next)} />
          <p className="mt-8 border-t border-stone-200 pt-5 text-xs leading-5 text-stone-500">ระบบใช้ Supabase Auth และแสดงข้อมูลตามบทบาท ขอบเขตหน่วยงาน และรายการที่ได้รับมอบหมาย</p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-[#c9440b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute top-0 right-0 h-full w-[42%] border-l border-white/15 bg-[#b73a08]" />
        <div className="relative max-w-2xl"><h2 className="text-5xl font-bold leading-[1.14] tracking-[-0.04em]">จากคำของบ<br />ถึงผลลัพธ์ที่ตรวจสอบได้</h2><p className="mt-6 max-w-xl text-base leading-7 text-orange-50/85">ติดตามข้อเสนอโครงการ ความก้าวหน้า การเบิกจ่าย และ KPI บนสายข้อมูลเดียว พร้อมหลักฐานและประวัติการตัดสินใจ</p></div>
        <div className="relative grid max-w-2xl gap-px border border-white/25 bg-white/25 sm:grid-cols-3">{["งบประมาณเชื่อมโยง", "รายงานทันรอบ", "หลักฐานครบถ้วน"].map((item) => <div className="bg-[#c9440b] p-5" key={item}><CheckCircle2 size={19} /><b className="mt-3 block text-sm">{item}</b></div>)}</div>
      </section>
    </main>
  );
}
