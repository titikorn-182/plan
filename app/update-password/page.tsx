import { ShieldCheck } from "lucide-react";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f7f5f2] p-6"><section className="w-full max-w-md border border-stone-200 bg-white p-7"><ShieldCheck className="text-[#c9440b]" size={32} /><h1 className="mt-5 text-2xl font-bold">กำหนดรหัสผ่านใหม่</h1><p className="mt-2 text-sm text-stone-500">ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษรและไม่ใช้ร่วมกับระบบอื่น</p><UpdatePasswordForm /></section></main>;
}
