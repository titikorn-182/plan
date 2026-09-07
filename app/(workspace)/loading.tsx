import { LoaderCircle } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <section className="flex min-h-44 items-center justify-center gap-3 p-6" role="status">
      <LoaderCircle
        className="animate-spin motion-reduce:animate-none"
        size={20}
        aria-hidden="true"
      />
      <p className="text-sm text-stone-600">กำลังเปิดเมนูและโหลดข้อมูลตามสิทธิ์ของคุณ…</p>
    </section>
  );
}
