import { LockKeyhole } from "lucide-react";
import { ResetForm } from "@/components/auth/reset-form";

export default function ForgotPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f7f5f2] p-6"><section className="w-full max-w-md border border-stone-200 bg-white p-7"><span className="grid size-11 place-items-center bg-[#cf430c] text-white"><LockKeyhole size={21} /></span><h1 className="mt-6 text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1><p className="mt-2 text-sm leading-6 text-stone-500">กรอกอีเมลที่ใช้ในระบบ เราจะส่งลิงก์ยืนยันตัวตนผ่าน Supabase Auth</p><ResetForm /></section></main>;
}
