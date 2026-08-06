'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('DEPARTMENT');

  // Saved Tags State
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [showSavedTags, setShowSavedTags] = useState(false);

  // Load saved tags on mount
  useEffect(() => {
    const loadedTags = localStorage.getItem('dms_saved_tags');
    if (loadedTags) {
      setSavedTags(JSON.parse(loadedTags));
    }
  }, []);

  const handleSaveTag = () => {
    if (!tags.trim()) return;
    
    // Split current tags and save them
    const newTags = tags.split(',').map(t => t.trim()).filter(t => t);
    const updatedTags = Array.from(new Set([...savedTags, ...newTags]));
    
    setSavedTags(updatedTags);
    localStorage.setItem('dms_saved_tags', JSON.stringify(updatedTags));
    toast.success('บันทึกคำค้นหาเรียบร้อยแล้ว');
  };

  const handleSelectSavedTag = (tag: string) => {
    if (!tags) {
      setTags(tag);
    } else {
      // Check if tag already exists in the input
      const currentTags = tags.split(',').map(t => t.trim());
      if (!currentTags.includes(tag)) {
        setTags(tags + (tags.endsWith(',') || tags.endsWith(', ') ? '' : ', ') + tag);
      }
    }
    setShowSavedTags(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // กำหนดให้รับเฉพาะ PDF และรูปภาพ
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('รองรับเฉพาะไฟล์ PDF, JPG และ PNG เท่านั้น');
      return;
    }
    
    // จำกัดขนาด 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setFile(selectedFile);
    // หากผู้ใช้ยังไม่ได้ตั้งชื่อ ให้ใช้ชื่อไฟล์เป็นค่าเริ่มต้น
    if (!title) {
      setTitle(selectedFile.name.split('.')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('กรุณาเลือกไฟล์ก่อนอัปโหลด');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('tags', tags);
      formData.append('visibility', visibility);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      toast.success('อัปโหลดไฟล์สำเร็จ!');
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setTags('');
      
    } catch (error) {
      console.error(error);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">อัปโหลดเอกสารใหม่</h1>
        <p className="text-slate-500 mt-1">นำเข้าเอกสารที่สแกนจากเครื่องปริ้น หรือไฟล์อิเล็กทรอนิกส์เข้าระบบ</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. File Upload Area */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">1. เลือกไฟล์เอกสาร</label>
              
              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-1">ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</h3>
                  <p className="text-sm text-slate-500 mb-4">รองรับไฟล์ PDF, JPG, PNG (สูงสุด 10MB)</p>
                  <button type="button" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg shadow-sm hover:bg-slate-50 transition">
                    ค้นหาไฟล์ในเครื่อง
                  </button>
                </div>
              ) : (
                <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-blue-600">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFile(null)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">2. รายละเอียดเอกสาร</label>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  ชื่อเอกสาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="เช่น ใบส่งตัวคนไข้, รายงานการประชุมเดือนสิงหาคม"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="เพิ่มข้อมูลที่ช่วยให้อธิบายเอกสารได้ดีขึ้น"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between items-center">
                  <span>คำค้นหา (Tags)</span>
                  {savedTags.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setShowSavedTags(!showSavedTags)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {showSavedTags ? 'ปิดรายการที่บันทึก' : 'เลือกจากที่บันทึกไว้'}
                    </button>
                  )}
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="เช่น ประกันสังคม, ภาษี, ใบเสร็จ (คั่นด้วยเครื่องหมาย ,)"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTag}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition whitespace-nowrap shrink-0"
                  >
                    บันทึก Tag
                  </button>
                </div>

                {showSavedTags && savedTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Saved Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {savedTags.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSavedTag(t)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-lg transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  สิทธิ์การเข้าถึง (Visibility)
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                >
                  <option value="DEPARTMENT">เห็นเฉพาะคนในแผนก (DEPARTMENT)</option>
                  <option value="PUBLIC">เห็นได้ทุกแผนก (PUBLIC)</option>
                  <option value="PRIVATE">ส่วนตัว (PRIVATE)</option>
                </select>
              </div>
            </div>

            {/* Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-800">
                เอกสารจะถูกอัปโหลดและจัดเก็บไว้ในแฟ้มของ <strong>แผนกคุณ</strong> โดยอัตโนมัติ 
                และจะถูกบันทึกประวัติว่าคุณเป็นผู้อัปโหลด
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <UploadCloud size={20} />
                อัปโหลดเอกสาร
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
