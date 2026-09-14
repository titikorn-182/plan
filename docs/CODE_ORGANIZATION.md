# แนวทางจัดวางโค้ด

โปรเจกต์นี้จัดโค้ดตาม **Feature** หรือความสามารถของระบบ เพื่อให้ไฟล์ที่เปลี่ยนพร้อมกันอยู่ใกล้กัน และให้ `app/` ทำหน้าที่กำหนด URL เป็นหลัก

## โครงสร้างหลัก

```text
app/                         routes, layouts, loading/error UI และ Route Handlers
components/
  auth/                      UI การยืนยันตัวตนที่ใช้หลายหน้า
  layout/                    โครงหน้าหลักและ navigation
  ui/                        UI primitive ที่ไม่รู้จัก business domain
features/
  <feature>/
    components/              หน้าจอและส่วนประกอบเฉพาะ feature
    actions.ts               Server Actions และคำสั่งเปลี่ยนข้อมูล
    queries.ts หรือ queries/ คำสั่งอ่านข้อมูลฝั่ง server
    types.ts                 type ของ feature
    *.ts                     validation, calculation และ business rules
  shared/                    สัญญาข้อมูลและ logic ที่ใช้ร่วมกันตั้งแต่ 2 feature ขึ้นไป
lib/                         infrastructure เช่น Supabase, config และ observability
types/                       type ที่ generate จากระบบภายนอก
tests/                       unit, integration, database, E2E และ UAT contracts
```

## กติกาการวางไฟล์

1. `app/**/page.tsx` ควรเป็น route บาง ๆ: อ่านสิทธิ์/ข้อมูล แล้วส่ง props ให้ component ของ feature
2. Component ที่รู้จักคำว่าโครงการ คำของบ KPI หรือ workflow ต้องอยู่ใน `features/<feature>/components/`
3. `components/ui/` รับเฉพาะ component กลาง เช่นช่องกรอก สถานะ pagination และ empty state ห้าม import business feature โดยตรง
4. Logic ที่ใช้ feature เดียวให้อยู่กับ feature นั้น หากมีผู้ใช้ตั้งแต่ 2 feature ขึ้นไปจึงย้ายไป `features/shared/` หรือ `lib/`
5. Client Component ใช้ `"use client"` เฉพาะไฟล์ที่เป็นขอบเขตเริ่มต้นของ interaction ไม่ต้องใส่ซ้ำทุกไฟล์ลูก
6. ไฟล์ฝั่ง server ที่ติดต่อฐานข้อมูลหรืออ่าน secret ต้องใช้ `import "server-only"`
7. ข้อมูลอ้างอิงที่เปลี่ยนตามปีงบประมาณ เช่น โครงสร้างแผนและหมวดรายจ่าย ต้องเก็บในฐานข้อมูลเป็น Master Data ไม่ประกาศรายการซ้ำในไฟล์ TypeScript
8. ค่าจำกัดร่วม เช่น ความยาวข้อความ จำนวนรายการ และวงเงินสูงสุด ต้องอ้างจาก `lib/config/limits.ts`
9. Type ของการยืนยันตัวตนที่ใช้ร่วมกันอยู่ใน `lib/auth/types.ts` เพื่อไม่ให้ infrastructure import ย้อนกลับเข้า feature
10. Business rule ที่หลาย feature ใช้ร่วมกันอยู่ใน `features/shared/` เช่น `operation-rules.ts` ส่วน parser ของรูปแบบไฟล์ทั่วไปอยู่ใน `lib/files/`
11. Server Action ที่คืนสถานะทางธุรกิจต้องใช้ `OperationStateWithStatus<สถานะที่อนุญาต>` ห้ามใช้ `string` กว้าง ๆ

## Master Data และ Database Type

- `plan_structure_master_data` เก็บผลผลิต แผนปฏิบัติการ และกิจกรรม แยกตามปีงบประมาณ
- `budget_expense_master_data` เก็บความสัมพันธ์งบรายจ่าย หมวดรายจ่าย และหมวดรายจ่ายย่อย แยกตามปีงบประมาณ
- หน้าคำของบและข้อเสนอโครงการอ่านรายการผ่าน `features/shared/master-data-queries.ts` และใช้ type กลางใน `features/shared/master-data.ts`
- หลังเพิ่มหรือแก้ migration ให้เปิด Supabase ภายในเครื่องแล้วรัน `npm run types:generate:local` จากนั้นตรวจ `npm run typecheck`
- CI จะ generate `types/database.generated.ts` ใหม่จากฐานข้อมูลทดสอบและหยุดทันทีหากไฟล์ไม่ตรงกับ schema

## ทิศทาง dependency

```text
app → features → shared/lib → generated types
             ↘ components/ui
```

- Feature import ตัวเอง, `features/shared`, `components/ui` และ `lib` ได้
- การ import ข้าม feature ทำได้เมื่อเป็นความสัมพันธ์ทางธุรกิจจริง เช่น รายงานเบิกจ่ายต้องเลือกโครงการ
- ห้ามให้ `components/ui` import component หรือ business rule ของ feature
- ห้ามให้ `lib` importกลับไปหา UI หรือ feature
- UAT contract จะตรวจทิศทาง `lib → features` และการใช้ `any` แบบระบุชัด เพื่อป้องกันโครงสร้างถอยหลัง

## ก่อนเพิ่มไฟล์ใหม่

- เป็น URL หรือ API endpoint หรือไม่? วางใน `app/`
- เป็นหน้าจอเฉพาะงานหรือไม่? วางใน `features/<feature>/components/`
- เป็น UI กลางและไม่รู้จักโดเมนหรือไม่? วางใน `components/ui/`
- เป็นข้อมูล/กฎที่หลาย feature ใช้ร่วมกันหรือไม่? วางใน `features/shared/`
- เป็นการเชื่อมระบบภายนอกหรือ configuration หรือไม่? วางใน `lib/`
