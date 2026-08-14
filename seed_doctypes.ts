import { PrismaClient } from './src/generated/prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  await prisma.documentType.deleteMany({});
  
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    console.log('No admin found');
    return;
  }
  
  // Get all departments to assign
  const depts = await prisma.department.findMany();
  let targetDeptId = admin.departmentId;
  if (!targetDeptId && depts.length > 0) {
    targetDeptId = depts[0].id;
  }

  // 1. Quotation
  await prisma.documentType.create({
    data: {
      name: 'ใบเสนอราคา (Quotation)',
      description: 'ตัวอย่าง: เอกสารใบเสนอราคาสำหรับส่งให้ลูกค้า',
      departmentId: targetDeptId,
      schema: [
        { name: 'quoNo', label: 'เลขที่ใบเสนอราคา', type: 'text', required: true },
        { name: 'customerName', label: 'ชื่อบริษัทลูกค้า', type: 'text', required: true },
        { name: 'amount', label: 'ยอดเงิน (บาท)', type: 'number', required: true },
        { name: 'status', label: 'สถานะ', type: 'select', options: 'รอพิจารณา,อนุมัติ,ไม่อนุมัติ', required: true },
        { name: 'isUrgent', label: 'งานด่วนหรือไม่?', type: 'checkbox', required: false },
        { name: 'remark', label: 'หมายเหตุ', type: 'textarea', required: false },
      ]
    }
  });

  // 2. Employee Contract
  await prisma.documentType.create({
    data: {
      name: 'สัญญาจ้างงานพนักงาน',
      description: 'ตัวอย่าง: สัญญาการจ้างงานของพนักงานใหม่',
      departmentId: targetDeptId,
      schema: [
        { name: 'empId', label: 'รหัสพนักงาน', type: 'text', required: true },
        { name: 'empName', label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { name: 'startDate', label: 'วันที่เริ่มงาน', type: 'date', required: true },
        { name: 'contractType', label: 'ประเภทสัญญา', type: 'select', options: 'ประจำ,ชั่วคราว,ทดลองงาน', required: true },
        { name: 'note', label: 'ข้อตกลงพิเศษ', type: 'textarea', required: false },
      ]
    }
  });

  console.log('Sample Document Types seeded successfully!');
  await prisma.$disconnect();
}
main().catch(console.error);
