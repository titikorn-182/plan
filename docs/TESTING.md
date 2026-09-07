# ชุดทดสอบอัตโนมัติและ CI — ขั้นที่ 6

ชุดทดสอบนี้เพิ่มการตรวจโค้ดก่อนรวมงาน โดยไม่ใช้บัญชีหรือฐานข้อมูล production และไม่แทนการลงนาม UAT ของผู้ใช้งานจริง

## ผลตรวจบนเครื่อง วันที่ 7 กันยายน 2569

- `npm run check` ผ่าน: format, lint, TypeScript, Vitest 92 กรณี (unit 43, actions 17, database 32) และชุด Node tests เดิม 21 กรณี
- `npm run test:e2e` ผ่าน 8 smoke tests ด้วย Chromium หลัง production build
- `npm run build` ผ่าน และสร้าง build ปกติใหม่หลังจบ E2E แล้ว
- Full-stack suite ค้นพบครบ 16 tests แต่ยังไม่ได้รันทั้งชุดบนเครื่องนี้เพราะไม่มี Docker: 8 smoke tests ข้างต้นรันแล้ว อีก 8 กรณีที่ต้องใช้ Supabase stack ยังรอตรวจบน CI
- ยังไม่ได้ push, deploy, เปิด branch protection หรือ apply migration ไปยัง Supabase จริงในขั้นตอนนี้

## คำสั่งที่ใช้บ่อย

ใช้ Node.js 24 และติดตั้งตาม lockfile ด้วย `npm ci` บน Windows หาก PowerShell ไม่อนุญาต `npm.ps1` ให้ใช้ `npm.cmd` / `npx.cmd` แทน

| คำสั่ง                      | ตรวจอะไร                                                                   | ต้องมี Docker |
| --------------------------- | -------------------------------------------------------------------------- | ------------- |
| `npm run check`             | Format, lint, typecheck, Vitest และชุดตรวจเดิม                             | ไม่ต้อง       |
| `npm run test:unit`         | สูตรคำนวณ ค่าขอบเขต URL และข้อมูลไฟล์                                      | ไม่ต้อง       |
| `npm run test:integration`  | ฟอร์ม → validation → authentication → Server Action → คำสั่งฐานข้อมูล      | ไม่ต้อง       |
| `npm run test:db`           | รัน migrations จริง แล้วตรวจ RLS, RPC และ rollback ใน PostgreSQL แบบฝังตัว | ไม่ต้อง       |
| `npm run test:e2e`          | Build แล้วทดสอบหน้า login และเส้นทางที่ต้องล็อกอินผ่าน Chromium            | ไม่ต้อง       |
| `npm run test:e2e:workflow` | Workflow โครงการผ่าน UI, สิทธิ์ผ่าน Supabase API และการเบิกจ่ายพร้อมกัน    | ต้องมี        |
| `npm run test:uat`          | ชุด Node tests เดิม รวมถึงการตรวจข้อความใน source code                     | ไม่ต้อง       |

`test:uat` เป็นชื่อคำสั่งเดิม ไม่ใช่หลักฐานว่าผู้ใช้ยอมรับระบบแล้ว ส่วน action integration tests จำลองเฉพาะช่องทางติดต่อ Supabase และ cache ไม่ได้ส่ง HTTP จริง

## โครงสร้าง

```text
tests/
  unit/             สูตรธุรกิจและการตรวจ input
  integration/      การทำงานร่วมกันของ Server Actions และ helper จริง
  database/
    bootstrap.sql   จำลองเฉพาะ auth/storage ที่ PGlite ไม่มี
    fixtures.sql    ข้อมูลและบัญชีตัวอย่างเฉพาะฐานทดสอบ
    harness.ts      โหลด migrations และสลับตัวตนผู้เรียก
    *.test.ts       ตรวจ policy และ transaction
  e2e/              Chromium และ Supabase API tests
scripts/run-e2e.mjs  ตั้งค่าเฉพาะ localhost ก่อน build และรัน
.github/workflows/quality.yml
```

PGlite เป็น PostgreSQL แบบฝังตัว: ชุดทดสอบโหลด SQL migration ของโปรเจกต์จริงทุกไฟล์ตามลำดับ แต่จำลองตาราง Auth และ Storage ที่จำเป็น จึงตรวจ SQL, policy และ rollback ได้ ไม่ได้จำลอง Auth server, การรับส่งไฟล์ หรือการแข่งขันระหว่างหลาย connection ทั้งหมด

การทดสอบ RLS หมายถึงตรวจสิทธิ์ระดับแถวข้อมูล เช่น Staff เห็นเฉพาะงานตัวเอง ไม่ใช่แค่ซ่อนเมนู ส่วน transaction คือชุดการเปลี่ยนข้อมูลที่ต้องสำเร็จด้วยกัน หากเกิดข้อผิดพลาดต้องย้อนกลับทั้งหมด

## ขอบเขตที่มีการตรวจ

- KPI สูงกว่าดีกว่า/ต่ำกว่าดีกว่า/ใช่หรือไม่ใช่/แบบช่วง, ขอบสถานะ, ค่า 0, ค่าสูงสุด และตัวเลขที่ไม่สามารถคำนวณได้
- ค่าเฉลี่ย dashboard ถ่วงน้ำหนักตามจำนวนโครงการและวงเงิน, เป้าหมาย 4 ไตรมาส, วงเงินคงเหลือ
- URL กลับหลังล็อกอิน, รหัสผ่านยืนยัน, ชนิด/ขนาดไฟล์ และ path หลักฐานที่ผูกกับเจ้าของ
- ฟอร์มไม่ครบ, วันที่ไม่ถูกต้อง, session หมดอายุ, ข้อมูลถูกผู้อื่นแก้ไข, การส่งต่อ workflow ล้มเหลว และการซ่อนข้อความฐานข้อมูลภายใน
- สิทธิ์ Admin/User/Executive/Staff, บัญชีระงับ, สิทธิ์หมดอายุ, หน่วยงานอื่น, notifications และ Storage policy
- อนุมัติโครงการสองระดับ, ส่งกลับแก้ไข, ส่งคำของบซ้ำ, rollback เมื่อสร้าง task ล้มเหลว และวงเงินเบิกจ่าย
- รายงานรายไตรมาสและ KPI ผ่านขั้นรับรองแล้วแก้ไขไม่ได้, การตรวจ/ส่งกลับหลักฐาน, ป้องกันยกระดับสิทธิ์และ Admin ปิดสิทธิ์ตนเอง
- Full-stack suite ตรวจ login จริง, สร้าง/แก้ไข/ส่งโครงการ, User ตรวจ, Executive อนุมัติ, เจ้าของได้รับ notification และยอดเบิกจ่ายพร้อมกันไม่เกินวงเงิน

ยังไม่ครอบคลุมทุกหน้า/ทุก browser, อีเมลเชิญและ reset ผ่าน SMTP จริง, การอัปโหลดไฟล์จริงครบทุกชนิด, load test, backup/restore และ UAT กับเจ้าหน้าที่ ใช้ `docs/UAT.md` สำหรับขั้นถัดไป

## รัน browser smoke บนเครื่อง

```bash
npx playwright install chromium
npm run test:e2e
```

คำสั่งสร้าง production build แล้วเปิดเฉพาะ `http://127.0.0.1:3206` ใช้ API URL localhost กับคีย์จำลอง ไม่มีการล็อกอินบัญชีจริง และไม่ใช้ server ที่เปิดค้างไว้อัตโนมัติ พอร์ต 3206 ต้องว่าง

ค่าทดสอบถูกตั้งก่อน build เพราะ `NEXT_PUBLIC_*` ถูกฝังลงใน JavaScript ฝั่ง browser ตอน build คำสั่งนี้จึงสร้าง `.next` ด้วยค่าทดสอบ: หลังทดสอบ หากต้องการใช้ `npm start` กับค่าปกติ ให้รัน `npm run build` ใหม่ก่อน อย่านำ `.next` จาก E2E ไป deploy

รายงานอยู่ที่ `playwright-report/index.html` และ trace ของกรณีที่ล้มเหลวอยู่ใน `test-results/` ทั้งสองโฟลเดอร์ไม่เข้า Git

## รัน full-stack แบบแยกจาก production

1. ติดตั้งและเปิด Docker ก่อน
2. `supabase/config.toml` ตั้งชื่อ stack ว่า `planning-budget-tests` พอร์ต API 54321 และ DB 54322
3. เริ่มฐานทดสอบใหม่แล้วรัน:

```bash
npx supabase start
npx playwright install chromium
npm run test:e2e:workflow
```

CLI เริ่ม stack พร้อม migrations และ `tests/database/fixtures.sql` ห้ามรัน fixture นี้ผ่าน SQL Editor ของฐานจริง บัญชี `*@example.test` และรหัสผ่านใน fixture เป็นข้อมูลทดสอบที่เปิดเผยได้สำหรับ localhost เท่านั้น

ตัว runner อ่าน URL และ anon key จาก `supabase status -o json` และปฏิเสธ URL ที่ไม่ใช่ localhost ไม่ใช้ service-role key และไม่แก้ `.env.local` ของผู้ใช้

Full-stack tests เปลี่ยนข้อมูลจริงภายในฐานทดสอบ รวมถึงใช้วงเงินของ TEST-P1 จึงต้องเริ่มจาก fixture ใหม่ก่อนรันซ้ำ หากมี stack เก่าหรือเพิ่ม migration ให้ตรวจว่าคอนเทนเนอร์เป็น `planning-budget-tests` เท่านั้น แล้วใช้ `npx supabase db reset --local` ซึ่งจะล้างข้อมูลในฐาน local นี้ ห้ามใช้ `--linked` หรือ `--db-url` กับคำสั่ง reset

หยุดคอนเทนเนอร์ด้วย `npx supabase stop` เมื่องานเสร็จ ใน CI ใช้เครื่องชั่วคราวใหม่ทุกครั้งและหยุดแบบไม่เก็บ backup เฉพาะคอนเทนเนอร์ทดสอบ

## GitHub Actions และการป้องกันก่อน deploy

ไฟล์ `.github/workflows/quality.yml` รันเมื่อเปิด/อัปเดต PR, push ไป main หรือกด Run workflow:

1. `quality` ตรวจ format → lint → typecheck → unit/action/database tests → legacy tests → build
2. `browser-workflow` เปิด Supabase แยกบน runner, รัน full-stack suite และแนบรายงานเก็บ 7 วัน
3. `quality-gate` ผ่านเมื่อสองงานข้างต้นผ่านทั้งหมดเท่านั้น

workflow ใช้สิทธิ์ GitHub แบบอ่าน repository ไม่ใช้ production secrets และไม่ได้ deploy หรือรัน migration บนฐานจริง

หลัง push ครั้งแรกและเห็นชื่อ check แล้ว ผู้ดูแล repository ต้องเปิด branch protection/ruleset สำหรับ main: บังคับใช้ PR, require status check `quality-gate`, และจำกัดการ bypass รวมถึงการ push ตรง main ขั้นนี้ยังไม่ได้เปลี่ยนค่าใน GitHub ให้

`vercel.json` ตั้ง build command เป็น `npm run check && npm run build` ทำให้การตรวจที่ไม่ใช้ Docker ต้องผ่านก่อน Vercel build สำเร็จ ส่วน full-stack suite รันบน GitHub เท่านั้น การมี workflow ไม่ได้บังคับให้ Vercel รอผล browser test โดยอัตโนมัติ จึงต้องใช้ branch protection ก่อน merge และตั้ง Deployment Checks เพิ่มหากต้องการให้ Vercel รอผล CI โดยตรง

## Migration ที่ต้องนำขึ้นฐานจริงแยกต่างหาก

`supabase/migrations/202609070001_fix_admin_access_audit_columns.sql` แก้ RPC จัดการสิทธิ์ที่เดิมอ้าง `granted_by` แต่ตารางใช้ `created_by` และป้องกันค่า null ลอดเงื่อนไข Admin ลบสิทธิ์ตัวเอง มี regression tests รองรับแล้ว

ฐานที่มี migration ก่อนหน้านี้ครบแล้วให้รันเฉพาะไฟล์ใหม่นี้ หลังสำรองข้อมูลและได้รับอนุมัติ ไม่ต้องรัน migrations เก่าหรือ test fixtures ซ้ำ การ deploy แอปบน Vercel ไม่ได้ apply SQL ให้เอง

## แหล่งอ้างอิง

- Next.js testing guide ที่มากับรุ่นติดตั้ง: `node_modules/next/dist/docs/01-app/02-guides/testing/`
- [Playwright web server](https://playwright.dev/docs/test-webserver)
- [Supabase local testing / CI](https://supabase.com/docs/guides/deployment/ci/testing)
- [PGlite extensions](https://pglite.dev/extensions/)
- [Vercel buildCommand](https://vercel.com/docs/project-configuration#buildcommand)
