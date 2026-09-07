# ระบบบริหารแผน งบประมาณ และโครงการ

Next.js 16 App Router + TypeScript + Tailwind CSS + Supabase สำหรับบริหารคำของบ โครงการ รายงานรายไตรมาส การเบิกจ่าย และ KPI EdPEx/AUN-QA

## เริ่มใช้งานฐานข้อมูล

1. เปิด Supabase Dashboard ของโครงการ แล้วไปที่ **SQL Editor**
2. รันไฟล์ตามลำดับ:
   - `supabase/migrations/202609040001_initial_schema.sql`
   - `supabase/migrations/202609040002_rls_and_views.sql`
   - `supabase/migrations/202609040003_operational_workflows.sql`
   - `supabase/migrations/202609050001_correctness_and_type_safety.sql`
   - `supabase/migrations/202609070001_fix_admin_access_audit_columns.sql`
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
npm run check
npm run build
```

ใช้ `npm run format` เมื่อต้องการจัดรูปแบบไฟล์ TypeScript, TSX และ CSS อัตโนมัติด้วย Prettier

ชุดทดสอบอัตโนมัติแยกเป็น unit, action integration, PostgreSQL RLS/transaction และ browser E2E ดูวิธีรันและขอบเขตที่ยังต้อง UAT ใน [docs/TESTING.md](docs/TESTING.md)

GitHub Actions เตรียมตรวจ PR/main และ Vercel ตรวจ `npm run check` ก่อน build แล้ว แต่ผู้ดูแลต้องเปิด branch protection โดย require `quality-gate` หลัง push เพื่อบังคับให้ full-stack tests ผ่านก่อน merge

เมื่อ schema บน Supabase เปลี่ยน ให้รัน `npm run types:generate` เพื่อสร้างชนิดข้อมูล TypeScript ใหม่จากฐานข้อมูล แล้วตรวจทาน diff ก่อน commit

## โครงสร้างโค้ด

- `app/(workspace)` เก็บ route ที่ต้องเข้าสู่ระบบและใช้ shell/layout กลาง โดยวงเล็บเป็น route group จึงไม่เปลี่ยน URL
- `features/<feature>/components` เก็บ UI ที่ใช้เฉพาะฟีเจอร์นั้น โดยแยกส่วนแสดงผลออกจาก component หลักที่ดูแล state
- `features/<feature>/actions.ts` เก็บคำสั่งที่เปลี่ยนข้อมูลของแต่ละฟีเจอร์ เช่น โครงการ KPI หรือหลักฐาน
- `features/<feature>/queries.ts` เก็บการอ่านและแปลงข้อมูลจาก Supabase ของฟีเจอร์นั้น
- `features/<feature>/types.ts` เก็บ type, enum guard และข้อความสถานะที่เป็นกติกาของฟีเจอร์
- `features/shared` เก็บโค้ดกลางที่ใช้ร่วมกัน เช่น รอบรายงาน ตัวจัดรูปแบบตัวเลข ผลลัพธ์ query และสถานะของ server action
- `components/layout`, `components/modules` และ `components/ui` เก็บ shell, หน้าจอโมดูล และส่วนประกอบ UI ตามลำดับ
- `lib/config` เก็บค่าจำกัดส่วนกลาง เช่น จำนวนรายการต่อหน้าและความยาวข้อมูล เพื่อไม่ให้มี magic value กระจายอยู่ในโค้ด
- `lib/observability` เก็บ structured error logger ซึ่งสร้างรหัสเหตุการณ์สำหรับค้นหาใน production log โดยไม่เปิดเผยรายละเอียดฐานข้อมูลต่อ browser
- `lib` เก็บโครงสร้างพื้นฐานร่วม เช่น authentication, Supabase client ตัวช่วยฝั่ง browser และกติกาคำนวณที่ไม่มี UI
- `app/styles` แยก CSS ตามหน้าที่ ได้แก่ design tokens, workspace shell, form และส่วนต่าง ๆ ของ Executive Command Center
- `types/database.generated.ts` สร้างจาก schema ของ Supabase และไม่ควรแก้ด้วยมือ

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
- อัปโหลดหลักฐานจาก browser ตรงเข้า private bucket แล้วลงทะเบียน metadata ผ่าน Route Handler ที่ตรวจ session, path, ชนิดและขนาดไฟล์ ดาวน์โหลดด้วย signed URL และรับรอง/ส่งกลับได้
- Workflow สองระดับ, notification center และ audit trail
- Admin แก้บทบาท ขอบเขตหน่วยงาน สถานะบัญชี และเชิญผู้ใช้ได้
- ทะเบียนข้อมูลขนาดใหญ่แบ่งหน้าที่ Supabase ฝั่งเซิร์ฟเวอร์ ไม่โหลดข้อมูลทั้งหมดเข้า browser

คู่มือทดสอบและนำขึ้นระบบอยู่ที่ `docs/UAT.md` และ `docs/DEPLOYMENT.md` ส่วน import/export แบบกลุ่มและรายการงบประมาณย่อยยังอยู่นอกลำดับงานรอบนี้
