import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "H.N.", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { department: true },
        });

        if (!user) {
          throw new Error("ไม่พบผู้ใช้งานนี้ในระบบ");
        }

        if (user.isActive === false) {
          throw new Error("บัญชีนี้ถูกระงับการใช้งาน โปรดติดต่อผู้ดูแลระบบ");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        let effectiveRole = user.role;
        if (
          user.role === "DEPT_HEAD" &&
          (user.department?.name === "DEV" || user.department?.name === "แผนก IT" || user.department?.name === "IT")
        ) {
          effectiveRole = "SUPER_ADMIN";
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: effectiveRole,
          departmentId: user.departmentId,
          departmentName: user.department?.name,
          forcePasswordChange: (user as any).forcePasswordChange,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      // Allows absolute URLs (like http://192.168.1.x/login)
      return url;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as string;
        token.departmentId = user.departmentId as string;
        token.departmentName = user.departmentName as string;
        token.forcePasswordChange = (user as any)
          .forcePasswordChange as boolean;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.departmentId = token.departmentId as string;
        session.user.departmentName = token.departmentName as string;
        (session.user as any).forcePasswordChange =
          token.forcePasswordChange as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-key-for-dev",
};
