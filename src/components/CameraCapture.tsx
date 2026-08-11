"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, X, Check, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งาน");
      onCancel();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photo) {
      // Convert base64 to file
      fetch(photo)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `scan_${new Date().getTime()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl">
        <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera size={20} /> ถ่ายภาพเอกสาร / สแกน
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {!photo ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={photo} alt="Captured scan" className="w-full h-full object-contain" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex justify-center gap-4 bg-slate-900">
          {!photo ? (
            <button 
              onClick={takePhoto}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-slate-200 transition-colors border-4 border-slate-400"
            >
              <div className="w-12 h-12 rounded-full border-2 border-slate-800"></div>
            </button>
          ) : (
            <>
              <button 
                onClick={retakePhoto}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
              >
                <RefreshCw size={20} /> ถ่ายใหม่
              </button>
              <button 
                onClick={confirmPhoto}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                <Check size={20} /> ใช้ภาพนี้
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
