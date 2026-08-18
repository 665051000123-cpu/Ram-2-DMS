const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.documentType.create({
    data: {
      name: 'สัญญาว่าจ้างพนักงาน',
      description: 'ใช้สำหรับเก็บเอกสารสัญญาว่าจ้างและข้อตกลงต่างๆ',
      visibleTo: ['GLOBAL'],
      schema: [
        { name: 'employee_name', label: 'ชื่อพนักงาน', type: 'text', required: true, placeholder: 'นาย/นางสาว...' },
        { name: 'start_date', label: 'วันที่เริ่มงาน', type: 'date', required: true },
        { name: 'department', label: 'แผนก/สังกัด', type: 'select', required: true, options: 'IT,HR,Marketing,Accounting,Operations' },
        { name: 'salary', label: 'อัตราเงินเดือนเริ่มต้น', type: 'number', required: false, placeholder: 'ระบุตัวเลข' },
        { name: 'is_probation', label: 'อยู่ในช่วงทดลองงาน', type: 'checkbox', required: false },
        { name: 'note', label: 'หมายเหตุเพิ่มเติม', type: 'textarea', required: false }
      ]
    }
  });

  await prisma.documentType.create({
    data: {
      name: 'ใบสั่งซื้อ (Purchase Order)',
      description: 'เอกสารสั่งซื้อสินค้าหรือบริการจาก Supplier',
      visibleTo: ['GLOBAL'],
      schema: [
        { name: 'po_number', label: 'เลขที่ใบสั่งซื้อ (PO No.)', type: 'text', required: true },
        { name: 'supplier_name', label: 'ชื่อผู้ขาย/บริษัท (Supplier)', type: 'text', required: true },
        { name: 'po_date', label: 'วันที่สั่งซื้อ', type: 'date', required: true },
        { name: 'total_amount', label: 'ยอดรวมสุทธิ (บาท)', type: 'number', required: true },
        { name: 'status', label: 'สถานะการสั่งซื้อ', type: 'radio', required: true, options: 'รอดำเนินการ,กำลังจัดส่ง,เสร็จสิ้น,ยกเลิก' }
      ]
    }
  });

  console.log('Successfully created sample document types!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
