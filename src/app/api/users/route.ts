import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ดึงเฉพาะพนักงานในแผนกเดียวกัน
    const users = await prisma.user.findMany({
      where: {
        departmentId: session.user.departmentId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const mappedUsers = users.map(u => ({
      ...u,
      role: u.role === 'DEPT_HEAD' ? 'DEPARTMENT_HEAD' : u.role
    }));

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // เช็คสิทธิ์ (ต้องเป็น Admin หรือ Department Head) ถึงจะเพิ่มคนได้
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'DEPARTMENT_HEAD')) {
      return NextResponse.json({ error: 'Unauthorized or insufficient permissions' }, { status: 403 });
    }

    const { name, email, password, role, departmentId } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine the department ID to assign
    // If the creator is a DEPARTMENT_HEAD, force the new user to be in the same department
    // If the creator is a SUPER_ADMIN, they can specify the departmentId
    let targetDepartmentId = session.user.departmentId;
    if (session.user.role === 'SUPER_ADMIN' && departmentId) {
      targetDepartmentId = departmentId;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const mappedRole = role === 'DEPARTMENT_HEAD' ? 'DEPT_HEAD' : role;

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: mappedRole,
        departmentId: targetDepartmentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    const userToReturn = {
      ...newUser,
      role: newUser.role === 'DEPT_HEAD' ? 'DEPARTMENT_HEAD' : newUser.role
    };

    return NextResponse.json({ success: true, user: userToReturn }, { status: 201 });
  } catch (error) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
