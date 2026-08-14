const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DocumentList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Revert visibleFolders at root level
const revertTarget = `                      if (!currentLevel) {
                        visibleDepartments = departments || [];
                        visibleFolders = folders.filter(f => !f.departmentId && !f.parentId);
                        visibleDocs = filteredDocs.filter(d => !d.departmentId && !d.folder);
                        
                        if (searchTerm) {
                          visibleDepartments = visibleDepartments.filter(d => 
                            d.name.toLowerCase().includes(searchLower)
                          );
                          visibleFolders = visibleFolders.filter(f => 
                            f.name.toLowerCase().includes(searchLower)
                          );
                        }
                      }`;
const revertReplacement = `                      if (!currentLevel) {
                        visibleDepartments = departments || [];
                        if (searchTerm) {
                          visibleDepartments = visibleDepartments.filter(d => 
                            d.name.toLowerCase().includes(searchLower)
                          );
                        }
                      }`;

content = content.replace(revertTarget, revertReplacement);

// 2. Change handleCreateFolder logic
const handleCreateFolderTarget = `      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newFolderName.trim(),
          departmentId,
          parentId
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create folder");
      }

      toast.success("สร้างหมวดหมู่สำเร็จ");`;

const handleCreateFolderReplacement = `      let res;
      if (currentPath.length === 0) {
        res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: newFolderName.trim()
          }),
        });
      } else {
        res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: newFolderName.trim(),
            departmentId,
            parentId
          }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create item");
      }

      toast.success(currentPath.length === 0 ? "เพิ่มแผนกใหม่สำเร็จ" : "สร้างแฟ้มย่อยสำเร็จ");`;

if (content.includes('toast.success("สร้างหมวดหมู่สำเร็จ");')) {
    content = content.replace(handleCreateFolderTarget, handleCreateFolderReplacement);
}

// 3. Update create button
const buttonTarget = `<Folder size={16} /> {currentPath.length === 0 ? "สร้างหมวดหมู่" : "สร้างแฟ้มย่อย"}`;
const buttonReplacement = `{currentPath.length === 0 ? <Building2 size={16} /> : <Folder size={16} />} {currentPath.length === 0 ? "เพิ่มแผนกใหม่" : "สร้างแฟ้มย่อย"}`;
content = content.replace(buttonTarget, buttonReplacement);

// 4. Update Modal Titles
const modalTitleTarget = `{currentPath.length === 0 ? "สร้างหมวดหมู่ใหม่" : "สร้างแฟ้มย่อยใหม่"}`;
const modalTitleReplacement = `{currentPath.length === 0 ? "เพิ่มแผนกใหม่" : "สร้างแฟ้มย่อยใหม่"}`;
content = content.replace(modalTitleTarget, modalTitleReplacement);

const inputLabelTarget = `{currentPath.length === 0 ? "ชื่อหมวดหมู่ใหม่" : "ชื่อแฟ้มย่อยใหม่"}`;
const inputLabelReplacement = `{currentPath.length === 0 ? "ชื่อแผนกใหม่" : "ชื่อแฟ้มย่อยใหม่"}`;
content = content.replace(inputLabelTarget, inputLabelReplacement);

fs.writeFileSync(filePath, content);
console.log("Updated DocumentList.tsx to handle department creation at root level.");
