const fs = require('fs');
const file = 'src/app/(dashboard)/upload/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetState = `  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);`;
const replaceState = targetState + `\n  const [allowedFileTypesStr, setAllowedFileTypesStr] = useState("pdf, jpg, png, jpeg, docx, xlsx");`;
content = content.replace(targetState, replaceState);

const targetFetch = `          setMaxFileSizeMB(data.maxFileSizeMB || 10);
        }`;
const replaceFetch = `          setMaxFileSizeMB(data.maxFileSizeMB || 10);
          if (data.allowedFileTypes) setAllowedFileTypesStr(data.allowedFileTypes);
        }`;
content = content.replace(targetFetch, replaceFetch);

const targetValidate = `  const validateAndSetFile = (selectedFile: File) => {
    // จำกัดเฉพาะไฟล์ PDF และรูปภาพ
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error(\`ไฟล์ \${selectedFile.name} ไม่รองรับ (เฉพาะ PDF, JPG, PNG)\`);
      return;
    }`;
const replaceValidate = `  const validateAndSetFile = (selectedFile: File) => {
    const allowedExtensions = allowedFileTypesStr.split(",").map(t => t.trim().toLowerCase());
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() || "";

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(\`ไฟล์ \${selectedFile.name} ไม่รองรับ (อนุญาตเฉพาะ: \${allowedFileTypesStr})\`);
      return;
    }`;
content = content.replace(targetValidate, replaceValidate);

fs.writeFileSync(file, content, 'utf8');
console.log('Update complete');
