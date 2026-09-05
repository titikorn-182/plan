import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/schemas";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="grid min-h-screen bg-[#f7f5f2] lg:grid-cols-[minmax(420px,0.85fr)_1.15fr]">
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <header className="mb-8">
            <div className="flex items-center gap-3">
              <span className="grid size-16 shrink-0 place-items-center border border-stone-200 bg-[#efefef]">
                <Image
                  alt="ตรามหาวิทยาลัยอุบลราชธานี"
                  className="h-14 w-auto object-contain"
                  height={1124}
                  src="/branding/ubu-emblem.png"
                  width={960}
                />
              </span>
              <span className="grid size-16 shrink-0 place-items-center border border-stone-200 bg-[#efefef]">
                <Image
                  alt="ตราคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี"
                  className="size-[3.55rem] object-contain"
                  height={447}
                  src="/branding/political-science-ubu.png"
                  width={447}
                />
              </span>
            </div>
            <p className="mt-3 max-w-md text-[17px] font-extrabold leading-[1.45] tracking-[-0.015em] text-stone-950">
              ระบบบริหารจัดการงบประมาณและการบริหารกิจกรรมโครงการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี
            </p>
          </header>
          <h1 className="text-3xl font-bold tracking-[-0.03em]">เข้าสู่ระบบเพื่อดำเนินงาน</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">ใช้อีเมลสถาบันและรหัสผ่านของคุณ ระบบจะแสดงข้อมูลตามบทบาทและหน่วยงานที่ได้รับสิทธิ์</p>
          {error ? <p className="mt-5 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{error === "inactive" ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" : "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบหรือขอลิงก์ใหม่"}</p> : null}
          <LoginForm nextPath={safeNextPath(next)} />
          <footer className="mt-8 border-t border-stone-200 pt-5 text-stone-500">
            <p className="text-xs leading-5">ระบบใช้ Supabase Auth และแสดงข้อมูลตามบทบาท ขอบเขตหน่วยงาน และรายการที่ได้รับมอบหมาย</p>
            <p className="mt-4 text-[11px] leading-5 text-stone-600">
              <span className="block"><strong className="font-semibold text-stone-700">พัฒนาโดย</strong> สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</span>
              <span className="block">ฐิติกรณ์รัศมิ์ ภัททสิริภูวดล เจ้าหน้าที่บริหารงานทั่วไปชำนาญการพิเศษ</span>
            </p>
          </footer>
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
