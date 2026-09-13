---
version: 1
slug: "app-workspace-reports-project-results-page-tsx"
primary_target: "app/(workspace)/reports/project-results/page.tsx"
related_targets: ["components/modules/project-completion-reports-view.tsx","components/modules/project-completion-report-form.tsx","features/project-completion-reports","supabase/migrations/202609130002_project_completion_reports.sql"]
---

MODE: Operate

THESIS: รายงานผลโครงการเป็นจุดปิดวงจรที่มองเห็นกำหนด 15 วัน สถานะ และงานที่ต้องทำทันที ไม่ใช่แบบฟอร์มรายไตรมาสที่เปลี่ยนชื่อ

OWN-WORLD: สืบทอด Executive Evidence Ledger: Sarabun, พื้นขาว, เส้นทะเบียน 1px, controls เหลี่ยม, orange wash สำหรับงานปัจจุบัน และสีสถานะพร้อมข้อความกำกับ

STORY: ผู้ใช้เห็นโครงการที่ใกล้ครบกำหนดหรือเกินกำหนด → เปิดรายงานที่ผูกกับโครงการ → บันทึกผลจริงและบทเรียน → แนบหลักฐานจากทะเบียนหลักฐาน → ส่งเข้าสู่ workflow → ผู้ตรวจและผู้บริหารรับรอง → ระบบปิดโครงการ

FIRST VIEWPORT: แถบสรุป SLA 15 วันและจำนวนรอส่งอยู่เหนือทะเบียน; ตารางแสดงโครงการ วันสิ้นสุด กำหนดส่ง วันคงเหลือ และสถานะ พร้อมปุ่มเริ่มหรือแก้ไขรายงานที่ชัดเจน

FORM: ฟอร์มหลักอยู่ซ้ายและ rail กำหนดส่งอยู่ขวา; เลือกโครงการแล้วคำนวณ due date อัตโนมัติ ช่องผลสำเร็จ การบรรลุวัตถุประสงค์ ตัวชี้วัด ผู้รับประโยชน์ ปัญหา บทเรียน และแผนต่อยอด รองรับ draft/submit/revision/read-only

FORM SEED: inherited-operate-ledger-local-extension

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
