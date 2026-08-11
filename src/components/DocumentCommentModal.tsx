"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, XCircle, Send, Trash2, Loader2, User } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  user: {
    name: string;
    role: string;
  };
};

export default function DocumentCommentModal({
  isOpen,
  docId,
  docTitle,
  currentUserId,
  currentUserRole,
  onClose,
}: {
  isOpen: boolean;
  docId: string;
  docTitle: string;
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && docId) {
      fetchComments();
    }
  }, [isOpen, docId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        scrollToBottom();
      }
    } catch (error) {
      toast.error("ดึงข้อมูลคอมเมนต์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${docId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment })
      });
      
      if (res.ok) {
        setNewComment("");
        fetchComments();
      } else {
        const data = await res.json();
        toast.error(data.error || "บันทึกคอมเมนต์ไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("บันทึกคอมเมนต์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้?")) return;
    
    try {
      const res = await fetch(`/api/documents/${docId}/comments?commentId=${commentId}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        toast.success("ลบคอมเมนต์สำเร็จ");
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        toast.error("ลบคอมเมนต์ไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการลบคอมเมนต์");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                ความคิดเห็นและข้อเสนอแนะ
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                เอกสาร: <span className="font-semibold text-slate-700 dark:text-slate-300">{docTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500 rounded-lg transition"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Comment List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => {
              const isMine = comment.userId === currentUserId;
              const canDelete = isMine || currentUserRole === "SUPER_ADMIN";
              
              return (
                <div key={comment.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMine ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    <User size={16} />
                  </div>
                  
                  {/* Bubble */}
                  <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {comment.user.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {format(new Date(comment.createdAt), "dd MMM HH:mm")}
                      </span>
                    </div>
                    
                    <div className="group relative flex items-start gap-2">
                      {isMine && canDelete && (
                        <button 
                          onClick={() => handleDelete(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-opacity mt-1"
                          title="ลบคอมเมนต์"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      
                      <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                        isMine 
                          ? 'bg-blue-600 text-white rounded-tr-sm' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                      }`}>
                        {comment.text}
                      </div>
                      
                      {!isMine && canDelete && (
                        <button 
                          onClick={() => handleDelete(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-opacity mt-1"
                          title="ลบคอมเมนต์"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">ยังไม่มีความคิดเห็น</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">เริ่มพิมพ์ข้อความแรกเพื่อพูดคุยเกี่ยวกับเอกสารนี้ได้เลย</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="พิมพ์ข้อความที่นี่..."
              className="flex-1 max-h-32 min-h-[44px] p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none outline-none text-sm transition-colors"
              rows={newComment.split('\n').length > 1 ? Math.min(newComment.split('\n').length, 4) : 1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-2">กด Shift + Enter เพื่อขึ้นบรรทัดใหม่</p>
        </div>

      </div>
    </div>
  );
}
