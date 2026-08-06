'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Database, Download, FileText, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

interface AnalyticsDashboardProps {
  totalStorageMB: string;
  departmentStats: { name: string; value: number }[];
  topDownloadedDocs: { name: string; downloads: number }[];
  actionStats: { name: string; count: number }[];
  totalDocuments: number;
}

export default function AnalyticsDashboard({ 
  totalStorageMB, 
  departmentStats, 
  topDownloadedDocs, 
  actionStats,
  totalDocuments
}: AnalyticsDashboardProps) {

  const totalDownloads = actionStats.find(s => s.name === 'DOWNLOAD')?.count || 0;
  const totalViews = actionStats.find(s => s.name === 'VIEW')?.count || 0;

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">เอกสารทั้งหมดในระบบ</p>
            <p className="text-2xl font-bold text-slate-800">{totalDocuments} <span className="text-sm font-medium text-slate-400">ไฟล์</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Database size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">พื้นที่จัดเก็บรวม</p>
            <p className="text-2xl font-bold text-slate-800">{totalStorageMB} <span className="text-sm font-medium text-slate-400">MB</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Download size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">ยอดดาวน์โหลดรวม</p>
            <p className="text-2xl font-bold text-slate-800">{totalDownloads} <span className="text-sm font-medium text-slate-400">ครั้ง</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">ยอดการเปิดดูรวม</p>
            <p className="text-2xl font-bold text-slate-800">{totalViews} <span className="text-sm font-medium text-slate-400">ครั้ง</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Top Downloaded Documents (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">เอกสารที่ถูกดาวน์โหลดมากที่สุด (Top 5)</h3>
          {topDownloadedDocs.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDownloadedDocs} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="downloads" fill="#3b82f6" radius={[0, 4, 4, 0]} name="จำนวนดาวน์โหลด (ครั้ง)">
                    {topDownloadedDocs.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              ยังไม่มีข้อมูลการดาวน์โหลด
            </div>
          )}
        </div>

        {/* 3. Department Stats (Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">สัดส่วนเอกสารแยกตามแผนก</h3>
          {departmentStats.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {departmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              ยังไม่มีข้อมูลเอกสาร
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
