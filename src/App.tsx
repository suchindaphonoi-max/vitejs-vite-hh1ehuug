import React, { useState, useEffect, useRef } from 'react';
import { Camera, Settings, Users, History, Crosshair, CheckCircle2 } from 'lucide-react';

const CHOICES = ['ก', 'ข', 'ค', 'ง', 'จ'];
const TOTAL_QUESTIONS = 50;

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [answerKey, setAnswerKey] = useState<Record<number, string>>({});
  const [classes, setClasses] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // ฟังก์ชันเปิดกล้อง
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.log(err);
      alert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง");
    }
  };

  // ฟังก์ชันปิดกล้อง
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // ควบคุมการเปิด-ปิดกล้องตามแท็บที่เลือก
  useEffect(() => {
    if (activeTab === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const handleKeyToggle = (qNum: number, choice: string) => {
    setAnswerKey(prev => ({
      ...prev,
      [qNum]: prev[qNum] === choice ? '' : choice
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setClasses(data);
        alert("โหลดรายชื่อนักเรียนสำเร็จแล้ว!");
      } catch (err) {
        alert("รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ .json");
      }
    };
    reader.readAsText(file);
  };

  // ส่วนแสดงผลหน้าจอ (มี <div className="min-h-screen..."> ตัวเดียวคลุมทั้งหมด)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* ส่วนหัวแอป */}
      <nav className="bg-green-700 text-white p-4 shadow-md flex justify-between items-center z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CheckCircle2 size={24} /> OMR Scanner Pro
        </h1>
      </nav>

      {/* ส่วนเนื้อหาหลัก */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        
        {/* แท็บสแกน */}
        {activeTab === 'scan' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm text-center mb-4 border border-slate-100">
              <h2 className="font-bold text-lg text-slate-700">โหมดสแกนกระดาษคำตอบ</h2>
              <p className="text-sm text-slate-500">อนุญาตให้ใช้กล้อง และจัดกรอบให้อยู่ในเส้นนำสายตา</p>
            </div>
            <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-xl ring-4 ring-slate-800/10">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-[80%] border-4 border-green-500/60 rounded-xl relative">
                   <Crosshair className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500/50" size={64} />
                </div>
              </div>
            </div>
            <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
              <Camera size={24} /> สแกนข้อสอบ
            </button>
          </div>
        )}

        {/* แท็บตั้งเฉลย */}
        {activeTab === 'key' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="text-green-600" size={24} />
                <h2 className="font-bold text-lg">ตั้งค่าเฉลยข้อสอบ</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center p-3 border border-slate-200 rounded-xl bg-white">
                    <span className="text-sm font-bold text-slate-500 mb-2">ข้อ {i + 1}</span>
                    <div className="flex gap-1.5">
                      {CHOICES.map(c => (
                        <button
                          key={c}
                          onClick={() => handleKeyToggle(i + 1, c)}
                          className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                            answerKey[i + 1] === c ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* แท็บรายชื่อ */}
        {activeTab === 'classes' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-green-600" size={24} />
                <h2 className="font-bold text-lg">ฐานข้อมูลนักเรียน</h2>
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                <p className="text-sm font-medium text-slate-700 mb-1">นำเข้ารายชื่อนักเรียน</p>
                <label className="cursor-pointer bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 inline-block mt-2">
                  เลือกไฟล์ JSON
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
            {classes.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
                <h3 className="font-bold">ข้อมูลห้องเรียนที่โหลดแล้ว ({classes.length} ห้อง)</h3>
                {classes.map((c, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border flex justify-between items-center mt-2">
                    <div className="font-bold text-green-700">{c.className}</div>
                    <div className="text-xl font-black text-slate-700">{c.students?.length || 0} คน</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* แท็บประวัติ */}
        {activeTab === 'history' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-10 rounded-xl shadow-sm border text-center">
              <History className="mx-auto text-slate-400 mb-4" size={32} />
              <h2 className="font-bold text-lg text-slate-700">ประวัติการตรวจข้อสอบ</h2>
              <p className="text-slate-500 text-sm">ยังไม่มีข้อมูลการสแกนในขณะนี้</p>
            </div>
          </div>
        )}
      </main>

      {/* เมนูด้านล่างสุด */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around pb-2 shadow-lg z-50">
        {[
          { id: 'scan', name: 'สแกน', icon: Camera },
          { id: 'key', name: 'ตั้งเฉลย', icon: Settings },
          { id: 'classes', name: 'รายชื่อ', icon: Users },
          { id: 'history', name: 'ประวัติ', icon: History }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-3 pt-4 flex flex-col items-center gap-1 ${
              activeTab === t.id ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <t.icon size={24} />
            <span className="text-[11px] font-semibold">{t.name}</span>
          </button>
        ))}
      </div>
      
    </div>
  );
}