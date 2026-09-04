import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f2] p-6">
      <section className="w-full max-w-lg border border-stone-200 bg-white p-8 text-center"><FileQuestion className="mx-auto text-[#c9440b]" size={36} /><p className="mt-5 text-xs font-bold tracking-[0.16em] text-[#b53807] uppercase">404 · Not found</p><h1 className="mt-2 text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1><p className="mt-3 text-sm leading-6 text-stone-500">ลิงก์นี้อาจถูกย้าย หรือบทบาทของคุณอาจไม่มีสิทธิ์เข้าถึงข้อมูลดังกล่าว</p><Link className="mt-6 inline-flex items-center gap-2 bg-[#cf430c] px-5 py-3 text-sm font-bold text-white" href="/"><ArrowLeft size={16} /> กลับหน้าภาพรวม</Link></section>
    </main>
  );
}

