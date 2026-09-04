# ระบบบริหารแผน งบประมาณ และโครงการ

Next.js 16 App Router + TypeScript + Tailwind CSS + Supabase สำหรับบริหารคำของบ โครงการ รายงานรายไตรมาส การเบิกจ่าย และ KPI EdPEx/AUN-QA

## เริ่มใช้งานฐานข้อมูล

1. เปิด Supabase Dashboard ของโครงการ แล้วไปที่ **SQL Editor**
2. รันไฟล์ตามลำดับ:
   - `supabase/migrations/202609040001_initial_schema.sql`
   - `supabase/migrations/202609040002_rls_and_views.sql`
   - `supabase/migrations/202609040003_operational_workflows.sql`
   - `supabase/seed.sql`
3. ไปที่ **Authentication > Users** และสร้างผู้ใช้คนแรก
4. แก้อีเมลตัวอย่างใน `supabase/bootstrap-admin.example.sql` แล้วรันไฟล์นั้นเพื่อให้ผู้ใช้คนแรกเป็น Admin
5. ที่ **Authentication > URL Configuration** ตั้ง Site URL เป็น `http://localhost:3000` และเพิ่ม `http://localhost:3000/auth/callback` ใน Redirect URLs สำหรับงานพัฒนา
6. รัน `supabase/verify.sql` และ `supabase/verify-operational.sql` เพื่อตรวจ schema, RLS, workflow, private storage และ seed

> คีย์ `service_role` ใช้เฉพาะการส่งคำเชิญจากหน้า Admin เท่านั้น ห้ามเก็บไว้ในตัวแปร `NEXT_PUBLIC_*`, browser หรือ commit ลง repository

## Environment variables

คัดลอก `.env.example` เป็น `.env.local` และกำหนด:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-rotated-server-only-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

โปรเจกต์ปัจจุบันมี `.env.local` สำหรับเครื่องนี้แล้ว และไฟล์ดังกล่าวถูก `.gitignore` ไว้

## รันโปรเจกต์

```bash
npm install
npm run dev
```

จากนั้นเปิด `http://localhost:3000`

## ตรวจคุณภาพ

```bash
npm run typecheck
npm run lint
npm run test:uat
npm run build
```

## ขอบเขตที่เชื่อมแล้ว

- Supabase Auth: เข้าสู่ระบบ ออกจากระบบ ลืมรหัสผ่าน และตั้งรหัสผ่านใหม่
- Session refresh ผ่าน Next.js 16 `proxy.ts`
- Schema, index, trigger, audit trail, role และ organization scope
- Row Level Security สำหรับ Admin, User, Executive และ Staff
- Dashboard และทะเบียนทุกโมดูลอ่านข้อมูลตาม RLS จาก Supabase
- ฟอร์มคำของบบันทึกฉบับร่างและส่งตรวจได้จริง พร้อม server-side validation และ optimistic version check
- สร้าง/แก้ไข/ส่งอนุมัติโครงการ และล็อกข้อมูลระหว่างอยู่ใน workflow
- บันทึกและส่งตรวจรายงานผลรายไตรมาส
- บันทึกเบิกจ่ายพร้อม database guard ป้องกันยอดเกินวงเงิน
- กรอกและส่งรับรอง KPI พร้อมคำนวณสถานะเทียบเป้าหมาย
- อัปโหลดหลักฐานเข้า private bucket ดาวน์โหลดด้วย signed URL และรับรอง/ส่งกลับได้
- Workflow สองระดับ, notification center และ audit trail
- Admin แก้บทบาท ขอบเขตหน่วยงาน สถานะบัญชี และเชิญผู้ใช้ได้

คู่มือทดสอบและนำขึ้นระบบอยู่ที่ `docs/UAT.md` และ `docs/DEPLOYMENT.md` ส่วน import/export แบบกลุ่มและรายการงบประมาณย่อยยังอยู่นอกลำดับงานรอบนี้
