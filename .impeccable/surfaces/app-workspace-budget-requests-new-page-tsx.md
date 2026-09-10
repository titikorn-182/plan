---
version: 1
slug: "app-workspace-budget-requests-new-page-tsx"
primary_target: "app/(workspace)/budget-requests/new/page.tsx"
related_targets: ["features/budget-requests/components/budget-request-workbook-form.tsx", "features/budget-requests/components/budget-request-import-panel.tsx", "features/budget-requests/components/budget-request-source-section.tsx", "features/budget-requests/components/budget-request-source-readiness.tsx", "features/budget-requests/source-fields.ts", "features/budget-requests/import-file.ts"]
---

MODE: Operate

THESIS: การสร้างคำของบเป็นสมุดงานต้นทางหน้าเดียว ไม่ใช่ wizard; ผู้ประสานงานต้องเห็นความครบถ้วน นำเข้าข้อมูล ตรวจแถว แก้รายละเอียดทั้ง 36 หัวข้อ และบันทึกหรือส่งได้ในกระแสต่อเนื่องเดียว

OWN-WORLD: สืบทอด Executive Evidence Ledger จาก DESIGN.md โดยตรง: พื้นขาวบน canvas อ่อน เส้นทะเบียน 1px รูปทรงเหลี่ยม Sarabun สีส้มสำหรับตำแหน่งและการกระทำหลัก และสถานะที่มีข้อความกำกับ; พื้นผิวนำเข้าใช้ orange wash เพื่อแยกงานจากไฟล์โดยไม่กลายเป็นการ์ดลอย

ENTRY: route โหลดหน่วยงาน ปีงบประมาณ และ budget cycle จากข้อมูลจริงก่อนแสดงฟอร์ม; หากข้อมูลตั้งต้นหายหรือ query ล้มเหลว ให้แสดง DataError และห้ามสร้างตัวเลือกสมมติ

STORY: เริ่มจากตรวจบริบทและตัวนับความครบถ้วน 0/36 → เลือกนำเข้า XLSX/CSV หรือกรอกเอง → ถ้านำเข้าให้เลือกแถวจาก preview ตรวจ error/warning แล้วกดใช้ข้อมูลอย่างชัดเจน → เลือกปีงบประมาณและชื่อหน่วยงานย่อยในหมวดหน่วยงานและแหล่งงบประมาณ โดยระบบเชื่อม organization scope ให้อัตโนมัติ → ทบทวนหมวดที่เหลือและ readiness → บันทึกฉบับร่างหรือส่งคำขอจาก action bar เดิม

FORM: ฟอร์มต่อเนื่องหนึ่งชุดเก็บหัวตาราง Executive DataProject ครบ 36 คอลัมน์ แบ่งเพื่อการสแกนเป็น 5 section ได้แก่ หน่วยงานและแหล่งงบประมาณ, โครงสร้างแผนและกิจกรรม, งบประมาณและแผนค่าใช้จ่าย, เป้าหมายเหตุผลและระยะเวลา, และผู้รับผิดชอบกับสายการอนุมัติ; ไม่มี section “ข้อมูลสำหรับบันทึกในระบบ” ที่ซ้ำกับข้อมูลต้นทาง โดย fiscal year เป็นช่องแรกใน section “หน่วยงานและแหล่งงบประมาณ” ส่วน organization scope อนุมานจากชื่อหน่วยงานย่อยและยังส่ง budget cycle ที่สัมพันธ์กันโดยไม่เพิ่มขั้นตอน wizard

SOURCE SELECTS: แหล่งงบประมาณใช้ 2 ค่าที่ผู้ใช้กำหนด; แหล่งงบประมาณย่อย ประเภทโครงการ ชื่อพันธกิจ และชื่อกลยุทธ์ใช้รายการไม่ซ้ำตามลำดับแรกจากคอลัมน์ D–G ของไฟล์ Executive DataProject; การนำเข้าแปลงค่าเดิม “เงินรายได้” เป็น “งบประมาณเงินรายได้” และค่าที่ไม่อยู่ในรายการต้องแก้ก่อนนำแถวนั้นไปใช้

PLAN SELECTS: รหัสและชื่อของผลผลิต แผนปฏิบัติการ และโครงการ/กิจกรรมใช้ Dropdown จากค่าที่ไม่ซ้ำตามลำดับแรกในคอลัมน์ J–O ของไฟล์ Executive DataProject ได้แก่ 5 ผลผลิต, 10 แผนปฏิบัติการ และ 30 โครงการ/กิจกรรม; ช่องชื่อโครงการ/กิจกรรมยังเป็นข้อมูลบังคับ

EXPENSE SELECTS: งบรายจ่าย หมวดรายจ่าย และหมวดรายจ่ายย่อยใช้ Dropdown จากค่าที่ไม่ซ้ำตามลำดับแรกในคอลัมน์ Q–S ของไฟล์ Executive DataProject ได้แก่ 4 งบรายจ่าย, 9 หมวดรายจ่าย และ 17 หมวดรายจ่ายย่อย; การนำเข้าต้องแจ้งค่าที่อยู่นอกรายการก่อนนำแถวไปใช้

IMPORT: รับเฉพาะ `.xlsx` และ `.csv`; หัวตารางต้องอยู่แถวแรกและมีชื่อครบทั้ง 36 คอลัมน์; ไฟล์ไม่เกิน 5 MB และข้อมูลไม่เกิน 500 แถว; duplicate/missing headers, ไฟล์ว่าง, แถวว่างทั้งหมด, ชนิดไฟล์ผิด และไฟล์ Excel ที่อ่านไม่ได้เป็น file-level errors ซึ่งต้องคงค่าฟอร์มเดิมไว้

PREVIEW: การอ่านไฟล์ไม่เขียนทับฟอร์มทันที; แสดงชื่อไฟล์ จำนวนรายการ และ select ของทุกแถวที่อ่านได้ โดย label ใช้เลขแถวและชื่อโครงการ/กิจกรรมที่หาได้; ผู้ใช้ต้องเลือกแถวและกด “ใช้ข้อมูลแถวนี้” ก่อนค่าจะถูกนำไปใช้

ROW VALIDATION: ตรวจรูปแบบและเพดานของยอดเงิน วันที่ ISO และลำดับวันเริ่ม–สิ้นสุด รวมถึงความยาวสูงสุดของแต่ละช่องเป็น blocking row errors; แถวที่มี error ยังแสดงใน preview แต่ปุ่มใช้ข้อมูลต้อง disabled; ช่องสำคัญที่ว่างเป็น warning เพื่อให้ผู้ใช้ยังนำเข้าแล้วเติมต่อในฟอร์มได้

REPLACE: ถ้าฟอร์มมีค่าอยู่แล้ว การกดใช้แถวครั้งแรกต้องเปิด confirmation แบบ inline ที่ระบุว่าจะเขียนทับข้อมูลเดิม; มีทั้งยกเลิกและ “ยืนยันการแทนที่”; การเปลี่ยนแถวต้องยกเลิก confirmation ที่ค้างอยู่

IMPORT LOCK: หลังการบันทึกครั้งแรกเมื่อ record มี id แล้ว ให้ disable file picker และ row selector พร้อมข้อความอธิบายว่าล็อกเพื่อป้องกันการเขียนทับรายการเดิม และมีทางไปสร้างคำขอใหม่; การล็อก import ไม่ทำให้ช่องกรอกของฉบับร่างกลายเป็น read-only

AUTOFILL: เมื่อใช้แถวที่เลือก ให้เติมทั้ง 36 ค่าในครั้งเดียว; ชื่อหน่วยงานย่อยเป็น select จากรายการอนุมัติ 15 หน่วยงานและจับคู่รหัส 2301/2302/2303 กับ organization scope ที่ผู้ใช้มีสิทธิ์โดยอัตโนมัติ; ชื่อจากไฟล์ที่ไม่อยู่ในรายการต้องปล่อยช่องชื่อและ scope ว่างเพื่อบังคับให้เลือกใหม่; fund code ที่รู้จักเติมชื่อกองทุน

READINESS: rail ด้านขวาแสดง 6 checks พร้อมจำนวนที่พร้อม ได้แก่ organization+fiscal year, ความสอดคล้องของ organization scope กับรหัสหน่วยงานย่อย, ชื่อ+ประเภทโครงการ, ผู้รับผิดชอบ, วงเงิน, และหลักการเหตุผล; ถ้างบรวมต่างจากยอดรวมแผนค่าใช้จ่าย ให้แสดงคำเตือนแบบข้อความ; readiness เป็นคำแนะนำก่อนส่ง ไม่ใช่การแทน server validation

RESPONSIVE: ที่ `xl` ขึ้นไปใช้ register กว้างคู่กับ sticky readiness rail 300px ซึ่งรวม section navigation แนวตั้ง; ต่ำกว่า `xl` ให้ซ่อน rail navigation และแสดง section navigation แนวนอนแบบ overflow ก่อนเนื้อหา เพื่อให้ tablet/mobile กระโดดข้ามฟอร์มยาวได้โดยไม่ย่อหัวข้อจนอ่านไม่ได้; ฟิลด์เปลี่ยนจากสองคอลัมน์เป็นหนึ่งคอลัมน์บนจอแคบ และ textarea กินเต็มแถวเมื่อมีพื้นที่

FEEDBACK: สถานะอ่านไฟล์ ผลการนำแถวไปใช้ และผลบันทึก/ส่งอยู่ใน polite live regions; file/row errors และ warnings แสดง inline ใกล้ preview; field errors จาก server เชื่อมด้วย `aria-invalid` และ `aria-describedby`; progress 0–100 มี accessible label และค่าปัจจุบัน

ACTION BAR: ใช้ FormActions และกฎ offset 206/72/0 จาก DESIGN.md; คงลำดับกลับทะเบียน/ยกเลิก → บันทึกฉบับร่าง → ส่งคำขอ, แสดง pending state และกันพื้นที่ท้ายฟอร์มไม่ให้แถบบังข้อมูล

DATA: title, owner, rationale, amount, project type และ proposal details สร้างจาก source values ชุดเดียวก่อนส่ง action; persistence, validation, optimistic version และ workflow behavior ยังเป็นอำนาจของ server action ไม่ใช่ parser ฝั่ง client

VERIFICATION: เอกสารนี้ถอดจาก route, workbook form, import panel, source sections, readiness rail, field schema และ parser ในโค้ดปัจจุบัน; ไม่มีการอ้าง screenshot หรือ visual review ใหม่

FINISH: surface brief สะท้อนฟอร์ม 36 ช่องแบบต่อเนื่อง การ preview/apply/replace/lock ของ import การตรวจแถว และ responsive section navigation ตาม implementation; DESIGN.md ไม่ต้องเปลี่ยนเพราะไม่มี durable system rule ใหม่
