# คู่มือนำขึ้นระบบจริง

## สถานะความพร้อม

โค้ดรองรับ Next.js 16 แบบ Node.js server, Server Components, Server Actions และ Proxy จึงต้องใช้ hosting ที่รัน Node.js และรองรับ streaming request/response ได้ การ deploy จริงต้องมีชื่อ platform, production domain และสิทธิ์เข้าถึงบัญชี hosting ก่อน

## 1. จัดการความลับก่อนทุกขั้นตอน

1. Rotate service role key ที่เคยถูกส่งผ่านแชต แล้วใช้ key ใหม่เท่านั้น
2. ห้ามใส่ service role key ใน Git, browser, `NEXT_PUBLIC_*` หรือ screenshot
3. ตั้งค่า environment variables ใน secret manager ของ hosting:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<new-rotated-service-role-key>
NEXT_PUBLIC_SITE_URL=https://<production-domain>
```

`SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ Server Action สำหรับเชิญผู้ใช้ใหม่ ส่วนการทำงานทั่วไปใช้ session และ RLS

## 2. อัปเดตฐานข้อมูล

ใน Supabase SQL Editor ให้รันไฟล์ต่อไปนี้ตามลำดับและรอให้แต่ละไฟล์สำเร็จก่อนเริ่มไฟล์ถัดไป:

1. `supabase/migrations/202609040001_initial_schema.sql`
2. `supabase/migrations/202609040002_rls_and_views.sql`
3. `supabase/migrations/202609040003_operational_workflows.sql`
4. `supabase/migrations/202609050001_correctness_and_type_safety.sql`
5. `supabase/migrations/202609070001_fix_admin_access_audit_columns.sql`
6. `supabase/migrations/202609070002_fix_project_insert_returning_rls.sql`
7. `supabase/migrations/202609070003_reporting_tools.sql`
8. `supabase/migrations/202609070004_admin_center.sql`
9. `supabase/verify-operational.sql` — เป็น read-only verification

หากระบบเดิมรัน migration บางส่วนแล้ว ให้เริ่มจากไฟล์ถัดไปตามลำดับ ห้ามรัน seed บน production เว้นแต่ได้รับอนุมัติว่าเป็นข้อมูลตัวอย่างที่ต้องการจริง

ไฟล์ `202609070002` แก้การสร้างโครงการพร้อมอ่านผลกลับ (`INSERT ... RETURNING`) โดยเปลี่ยนเฉพาะ policy การอ่านแถว ไม่ได้ปิด RLS หรือเปลี่ยนสิทธิ์การเพิ่ม/แก้ไข/ลบ การ Push หรือ Deploy Vercel ไม่ได้รันไฟล์นี้ให้: ผู้ดูแลต้องสำรองข้อมูลและ apply migration ที่ยังขาดบน Supabase ก่อนทดสอบสร้างโครงการในระบบจริง

ไฟล์ `202609070003` เพิ่มตารางกำหนดการรายงานพร้อม RLS และเพิ่มคอลัมน์ปีงบประมาณใน view สำหรับกรองข้อมูลจากตัวเลือกส่วนกลาง ต้อง apply ก่อนทดสอบตัวเลือกปี/ไตรมาส ตัวกรอง รายงาน และกำหนดการบนเว็บไซต์จริง ส่วนการส่งรายงานตามเวลาอัตโนมัติยังต้องเชื่อม Scheduled Runner และช่องทางส่งขององค์กรแยกจาก migration นี้

ไฟล์ `202609070004` เพิ่มศูนย์ดูแลระบบ ตารางตั้งค่ากลาง นโยบาย RLS การกู้คืนข้อมูล และกำหนดสิทธิ์ Admin ให้ `titikornrasmi.s@ubu.ac.th` ต้อง apply ก่อนเปิดหน้า Admin เวอร์ชันใหม่บนเว็บไซต์จริง

หลัง apply ตรวจแบบอ่านอย่างเดียวได้ด้วย `select policyname, cmd, roles, qual from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_select';` เงื่อนไขควรมีการตรวจ `organization_id`, `owner_id`, `coordinator_id` และ helper เดิม `can_access_project` จากนั้นทดสอบด้วยบัญชี Staff ที่ได้รับอนุมัติสำหรับ UAT ไม่ใช้ test fixtures บนฐานจริง

ผล verification ที่คาดหวัง:

- public RPC 5 รายการ
- view `workflow_inbox` และ `evidence_register`
- private bucket `evidence` จำกัด 20 MB
- trigger คุมวงเงิน, sync ยอด, sync หลักฐาน และ audit
- storage policies สำหรับ select/insert/delete

## 3. ตั้งค่า Supabase Auth

1. กำหนด Site URL เป็น production domain
2. เพิ่ม Redirect URL อย่างน้อย `https://<production-domain>/auth/callback` และ URL ของ UAT
3. เปิด email provider ที่องค์กรใช้และทดสอบ invitation/reset password
4. ตรวจอายุ session, rate limit และ SMTP quota ให้เหมาะกับผู้ใช้จริง
5. สร้าง Admin แรกด้วย `bootstrap-admin.example.sql` โดยแทน UUID จริง และลบค่าชั่วคราวหลังใช้งาน

## 4. Quality gate ก่อน deploy

```bash
npm ci
npm run check
npm run build
```

จากนั้นรัน production-like server ด้วย `npm start` และทำ smoke test เส้นทาง `/login`, `/projects`, `/approvals`, `/evidence`, `/admin`

## 5. Deploy

Vercel ใช้ build command จาก `vercel.json`: `npm run check && npm run build` ส่วน hosting แบบอื่นให้ใช้คำสั่งเดียวกันและ start command เป็น `npm start` ใช้ Node.js 24 ให้ตรงกับ CI และเปิด HTTPS เท่านั้น หากใช้ reverse proxy ต้องส่ง `Host`/`X-Forwarded-Host` ให้ถูกต้องเพื่อให้ CSRF origin check ของ Server Actions ผ่าน

ต้องตรวจ `quality-gate` บน GitHub ให้ผ่านก่อน merge และเปิด branch protection ตาม [TESTING.md](TESTING.md) หากยังไม่เปิด Vercel อาจเริ่ม deploy ไปพร้อมกับ CI ได้ การ deploy ไม่ได้รัน SQL migration และห้ามใช้ test fixtures กับ production

ไฟล์หลักฐานถูกอัปโหลดจาก browser ตรงไปยัง private bucket ของ Supabase จึงไม่ผ่าน Server Action หรือ Vercel Function body ระบบจำกัดไฟล์ไว้ที่ 20 MB ทั้งใน UI, Route Handler และ bucket policy ควรตรวจว่าเครือข่ายองค์กรอนุญาตการเชื่อมต่อ HTTPS ไปยัง Supabase Storage

## 6. Smoke test หลัง deploy

1. ผู้ใช้แต่ละ role เข้าสู่ระบบและเห็นเมนูตามสิทธิ์
2. Staff สร้างโครงการและส่งอนุมัติ
3. User เห็น task และส่งต่อ Executive
4. Executive อนุมัติ แล้วสถานะโครงการเป็น active
5. บันทึกเบิกจ่ายและทดสอบยอดเกินวงเงิน
6. อัปโหลดและดาวน์โหลดหลักฐานด้วย signed URL
7. Admin แก้ scope ผู้ใช้และยืนยันว่าบัญชีนอก scope มองไม่เห็นข้อมูล
8. ตรวจ dashboard, audit events และ notification badge
9. เปลี่ยนปี/ไตรมาส แล้วตรวจว่าทะเบียนและรายงานเปลี่ยนตามรอบเดียวกัน
10. ดาวน์โหลดแม่แบบ นำเข้า Preview ยืนยันเบิกจ่าย และส่งออก XLSX
11. สร้างรายงาน XLSX/หน้าพิมพ์ PDF และเพิ่ม/พัก/ลบกำหนดการ

## 7. Monitoring และ rollback

- เปิด server/error log และค้นหาเหตุการณ์ด้วย `eventId` จาก structured log `[application-error]` โดยห้ามบันทึก JWT, cookie, service role key หรือเนื้อหาไฟล์
- ตั้ง alert สำหรับ HTTP 5xx, auth error, storage error และ response time ของ Server Actions
- เปิด Supabase Point-in-Time Recovery หรือกำหนดรอบ backup ตามนโยบายองค์กร
- ก่อน migration ให้บันทึก backup และ release tag; rollback application ด้วย release ก่อนหน้า
- Schema migration นี้เพิ่ม object และ policy การ rollback ควรทำด้วย migration ใหม่ที่ผ่านการทดสอบ ห้ามลบ table หรือ bucket โดยตรงบน production

## สิ่งที่ต้องได้รับก่อนกด deploy จริง

- Platform/บัญชี hosting และ production domain
- service role key ที่ rotate ใหม่
- รายชื่อผู้ลงนาม UAT และผล UAT ที่ผ่านเกณฑ์
- วันเปิดระบบ เจ้าของ incident และช่องทางแจ้งเหตุ
