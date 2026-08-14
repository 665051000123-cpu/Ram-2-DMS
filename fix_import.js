const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DocumentList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('Inbox,') && !content.includes('Inbox }')) {
    // Find the end of lucide-react import
    content = content.replace(/} from "lucide-react";/, '  Inbox,\n} from "lucide-react";');
}

fs.writeFileSync(filePath, content);
console.log("Added Inbox to imports");
