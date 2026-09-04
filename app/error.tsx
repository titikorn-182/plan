"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-stone-100 p-6"><section className="w-full max-w-lg border border-stone-200 bg-white p-8 text-center"><AlertTriangle className="mx-auto text-red-600" size={34} /><h1 className="mt-4 text-2xl font-bold">ไม่สามารถแสดงข้อมูลส่วนนี้ได้</h1><p className="mt-2 text-sm leading-6 text-stone-600">ระบบเก็บรหัสเหตุการณ์ไว้แล้ว ลองโหลดข้อมูลอีกครั้ง หากยังพบปัญหาให้แจ้งผู้ดูแลระบบ</p>{error.digest ? <code className="mt-4 block bg-stone-100 px-3 py-2 text-xs text-stone-600">รหัส {error.digest}</code> : null}<button className="mt-5 inline-flex items-center gap-2 bg-[#cf430c] px-5 py-2.5 text-sm font-semibold text-white" onClick={reset}><RefreshCcw size={16} />ลองอีกครั้ง</button></section></main>;
}
