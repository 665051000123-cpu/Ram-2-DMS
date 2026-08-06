<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project-Scoped Rules: Hospital DMS (โรงพยาบาลราม 2)

## 1. Tech Stack (เทคโนโลยีที่ใช้)
*   **Frontend:** Next.js (App Router) + TailwindCSS
*   **Backend:** Node.js (Next.js API Routes / Prisma)
*   **Database:** MySQL (libsql/prisma)
*   **Storage:** Local/Cloud Storage

## 2. Core Business Rules
*   **Security First:** เช็คสิทธิ์ (Authorization) ทุก API Endpoint
*   **Role-Based Access Control (RBAC):** Admin, Department Head, Staff
*   **Department Isolation:** เห็นเอกสารเฉพาะแผนกตัวเอง (เว้นแต่จะตั้งเป็น PUBLIC หรือแชร์สิทธิ์ PRIVATE ให้รายบุคคล)
*   **Audit Logging:** เก็บ Log การกระทำสำคัญ (UPLOAD, VIEW, DOWNLOAD, EDIT, DELETE)
*   **Auto-Scanner Sync:** รองรับการดึงไฟล์จากโฟลเดอร์เครื่องสแกนเนอร์โดยอัตโนมัติผ่าน Node script (Hot Folder watcher)
*   **Soft Delete (Recycle Bin):** การลบไฟล์จะเป็นแค่การย้ายไปถังขยะ (isDeleted: true) โดยให้ Admin/Dept Head มีสิทธิ์กู้คืนหรือลบถาวร
*   **Notifications:** ระบบแจ้งเตือนพนักงานเมื่อมีเอกสารเข้าแผนก หรือมีการแชร์เอกสารมาให้ (สามารถตั้งค่าเปิด/ปิดได้ที่ Profile)
*   **Employee ID Validation:** รหัสพนักงานต้องมีความยาว 6 หลักพอดี และบังคับเปลี่ยนรหัสผ่านเมื่อ Login ครั้งแรก

## 3. Coding Standards
*   Clean Code, แบ่ง Component
*   ใช้ Environment Variables (.env)
*   วันที่แสดงผลเป็น พ.ศ. เก็บในฐานเป็น ISO 8601
*   **Port Config:** ตั้งค่ารันโปรเจกต์ไว้ที่พอร์ต 5175 ขึ้นไป

## 4. GitHub Sync
*   **Always Push to Main Repo:** The main repository is https://github.com/665051000123-cpu/Ram-2-DMS.git. After making significant code changes or upon user request, automatically commit and push the code with Thai commit messages.
commit message ต้องเป็น ภาษาไทย เช่น "เพิ่มฟีเจอร์ A", "แก้ไขบั๊ก B"
