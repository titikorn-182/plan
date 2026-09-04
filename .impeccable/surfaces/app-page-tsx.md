---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/dashboard/executive-dashboard.tsx", "components/layout/workspace-shell.tsx", "components/ui/operation-form.tsx", "components/modules", "app/operations/actions.ts", "app/globals.css", "lib/data/queries.ts", "lib/domain.ts"]
---

MODE: Operate

THESIS: ศูนย์บัญชาการผู้บริหารหนึ่งหน้าจอต้องทำให้เห็นงานที่ต้องตัดสินใจ เปรียบเทียบผลของทุกหน่วยงาน และตรวจหลักฐานต้นทางได้โดยไม่หลุดบริบท; ปฏิเสธแดชบอร์ดแบบกล่อง KPI ที่แยกตัวเลขออกจากรายการจริง

OWN-WORLD: โต๊ะทำงานหลักฐานที่หนาแน่นและแม่นยำ ใช้สีส้มสถาบันกับพื้นขาว เส้นทะเบียน 1px คมชัด ปุ่มและพื้นผิวทรงเหลี่ยม ตัวอักษร Noto Sans Thai และสีสถานะที่มีป้ายหรือคำอธิบายกำกับเสมอ; ไม่มี gradient และไม่มีภาพตกแต่ง

STORY: ผู้บริหารกำหนดปีงบประมาณและไตรมาส ตรวจคิวตัดสินใจแนวนอน เลือกหน่วยงานจากเมทริกซ์ข้ามองค์กร แล้วตรวจสรุป หลักฐาน และทะเบียนอ้างอิงจาก inspector โดยไม่ออกจากบริบทการเปรียบเทียบ

OPERATIONAL SURFACES: โลกเดียวกันครอบคลุมการสร้าง/แก้ไข/ส่งโครงการ รายงานรายไตรมาส การบันทึกเบิกจ่าย ผลและการรับรอง KPI การอัปโหลด/ตรวจหลักฐาน กล่องอนุมัติ ศูนย์แจ้งเตือน และ Admin access editor; แบบฟอร์มหลักอยู่ในทะเบียนกว้างคู่กับ contextual panel 310–330px

FIRST VIEWPORT: แถบเมนูข้อความเต็ม 190px; utility bar 58px สำหรับปีงบประมาณ ไตรมาส สถานะข้อมูลจริง และเครื่องมือ; คิวตัดสินใจสูง 102px สูงสุด 6 รายการ; เมทริกซ์หน่วยงานเป็นพื้นที่หลัก; evidence inspector 286px ด้านขวา

RESPONSIVE: ที่ 1100px inspector ลงใต้เมทริกซ์; ที่ 960px sidebar เหลือ rail ไอคอน 72px; ที่ 760px เมนูย้ายเป็น bottom nav คงที่ 62px, utility bar ซ้อน, คิวเลื่อนแนวนอน, filter ซ้อน และเมทริกซ์เปลี่ยนเป็น mobile record list; ที่ 480px ซ่อนเฉพาะข้อความ utility ที่ยังมี accessible name

FORM ACTION BAR: แถบ action คงที่ด้านล่างต้องชิดพื้นที่ทำงานด้วย offset ซ้าย 206px บน desktop, 72px ที่ไม่เกิน 960px และ 0 ที่ไม่เกิน 700px; คงลำดับ ยกเลิก → บันทึกฉบับร่าง → ส่ง และกันพื้นที่ท้ายฟอร์มไม่ให้แถบบังข้อมูล

NAVIGATION: ใช้เส้นทางที่ตรงและยาวที่สุดเป็น active item เพียงรายการเดียว; `/reports/quarterly` ต้องชนะ `/reports` และเส้นทาง new/edit ต้องสืบทอด register ที่เฉพาะที่สุด

FEEDBACK: error รายฟิลด์ต้องมี `aria-invalid` และ `aria-describedby`; ผลบันทึก/ส่ง/ตรวจ/อนุมัติใช้ inline live region; page-level failure ใช้ alert; ปุ่ม pending แสดงสถานะและป้องกันการส่งซ้ำ

PROJECT READINESS: แสดง 3 จุดตรวจคงที่พร้อมตัวนับ 0/3–3/3 ได้แก่ เจ้าของ+ผู้ประสานงาน, วงเงิน+เป้าหมายเบิกจ่ายที่ถูกต้อง, และช่วงวันที่เริ่ม–สิ้นสุดที่ถูกต้อง

DATA: ใช้ข้อมูลจริงจาก authenticated Supabase client, role/organization RLS, optimistic version checks และ workflow RPCs สำหรับ project/report/KPI/evidence/approval/access mutations; เมื่อ query หรือ mutation ผิดพลาดให้แสดงข้อความตรงจุดและห้ามสร้างตัวเลข fallback

FORM: Executive Evidence Ledger; code-led dense command desk; vivid orange/white; square ledger geometry

VERIFICATION: current implementation is code/build verified; in-app-browser visual capture and reference-fidelity review were unavailable and remain pending; existing `.impeccable/review` rasters predate this implementation and must not be cited as current visual evidence

FINISH: documentation is reconciled to the current implementation; fresh desktop and mobile visual evidence is still required before claiming visual fidelity or screenshot review
