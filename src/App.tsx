import React, { useState, useEffect, useRef } from 'react';
import { Camera, Settings, Users, History, Crosshair, CheckCircle2, X, Save, Trash2 } from 'lucide-react';

const CHOICES = ['ก', 'ข', 'ค', 'ง', 'จ'];
const TOTAL_QUESTIONS = 50;

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [examLevel, setExamLevel] = useState<'junior' | 'senior'>('junior');
  const [answerKeys, setAnswerKeys] = useState<{
    junior: Record<number, string>, 
    senior: Record<number, string>
  }>({ junior: {}, senior: {} });
  const [classes, setClasses] = useState<any[]>([]);
  
  // *** เพิ่ม State สำหรับประวัติการสแกน และ Modal บันทึกคะแนน ***
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedClassIdx, setSelectedClassIdx] = useState<number>(-1);
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number>(-1);
  const [currentScore, setCurrentScore] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [scanStatus, setScanStatus] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // โหลดข้อมูลทั้งหมดเมื่อเปิดแอป
  useEffect(() => {
    const savedKeys = localStorage.getItem('omr_answer_keys');
    if (savedKeys) setAnswerKeys(JSON.parse(savedKeys));
    
    const savedClasses = localStorage.getItem('omr_classes');
    if (savedClasses) setClasses(JSON.parse(savedClasses));

    const savedHistory = localStorage.getItem('omr_history');
    if (savedHistory) setExamHistory(JSON.parse(savedHistory));
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setScanStatus(''); 
    } catch (err) {
      alert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'scan') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [activeTab]);

  const handleKeyToggle = (qNum: number, choice: string) => {
    setAnswerKeys(prev => {
      const updatedGroup = { ...prev[examLevel], [qNum]: prev[examLevel][qNum] === choice ? '' : choice };
      const newKeys = { ...prev, [examLevel]: updatedGroup };
      localStorage.setItem('omr_answer_keys', JSON.stringify(newKeys));
      return newKeys;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setClasses(JSON.parse(ev.target?.result as string));
        localStorage.setItem('omr_classes', ev.target?.result as string);
        alert("โหลดรายชื่อนักเรียนสำเร็จแล้ว!");
      } catch (err) {
        alert("รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ .json");
      }
    };
    reader.readAsText(file);
  };

  // *** ฟังก์ชันจัดการเมื่อสแกนเสร็จ ให้แสดงหน้าต่างบันทึกคะแนน ***
  const handleScanClick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const currentKey = answerKeys[examLevel];
    const maxScore = Object.keys(currentKey).filter(k => currentKey[parseInt(k)] !== '').length;
    
    if (maxScore === 0) {
      alert(`คุณยังไม่ได้ตั้งเฉลยสำหรับข้อสอบ ${examLevel === 'junior' ? 'ม.ต้น' : 'ม.ปลาย'} \nกรุณาไปที่แท็บ 'ตั้งเฉลย' ก่อนครับ`);
      return;
    }
    if (classes.length === 0) {
      alert("คุณยังไม่ได้โหลดรายชื่อนักเรียน \nกรุณาไปที่แท็บ 'รายชื่อ' เพื่ออัปโหลดไฟล์ JSON ก่อนครับ");
      return;
    }

    setIsScanning(true);
    setScanStatus('กำลังวิเคราะห์กระดาษคำตอบ...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      setTimeout(() => {
        setIsScanning(false);
        setScanStatus('สแกนสำเร็จ!');
        if (navigator.vibrate) navigator.vibrate(200);
        
        // จำลองการได้คะแนน (สุ่มคะแนน 70% - 100% ของคะแนนเต็ม) หรือให้ครูแก้เองได้
        const simulatedScore = Math.floor(maxScore * (0.7 + (Math.random() * 0.3)));
        setCurrentScore(simulatedScore > maxScore ? maxScore : simulatedScore);
        
        // รีเซ็ตการเลือกชื่อ
        setSelectedClassIdx(0);
        setSelectedStudentIdx(-1);
        setShowResultModal(true); // เปิดหน้าต่างบันทึก
        
      }, 800);
    }
  };

  // *** ฟังก์ชันบันทึกคะแนนลงประวัติ ***
  const saveResult = () => {
    if (selectedClassIdx === -1 || selectedStudentIdx === -1) {
      alert("กรุณาเลือกห้องและชื่อนักเรียนก่อนบันทึกครับ");
      return;
    }

    const currentKey = answerKeys[examLevel];
    const maxScore = Object.keys(currentKey).filter(k => currentKey[parseInt(k)] !== '').length;
    const selectedClass = classes[selectedClassIdx];
    const selectedStudent = selectedClass.students[selectedStudentIdx];

    const newRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('th-TH'),
      className: selectedClass.className,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      score: currentScore,
      fullScore: maxScore,
      level: examLevel === 'junior' ? 'ม.ต้น' : 'ม.ปลาย'
    };

    const updatedHistory = [newRecord, ...examHistory];
    setExamHistory(updatedHistory);
    localStorage.setItem('omr_history', JSON.stringify(updatedHistory));
    
    setShowResultModal(false);
    setScanStatus(`บันทึกคะแนนของ ${selectedStudent.name} สำเร็จ!`);
    
    // เคลียร์ข้อความสำเร็จหลังจาก 3 วินาที
    setTimeout(() => setScanStatus(''), 3000);
  };

  // ลบประวัติทั้งหมด
  const clearHistory = () => {
    if (window.confirm("คุณต้องการลบประวัติการสแกนทั้งหมดใช่หรือไม่?")) {
      setExamHistory([]);
      localStorage.removeItem('omr_history');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <nav className="bg-green-700 text-white p-4 shadow-md flex justify-between items-center z-10 relative">
        <h1 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 size={24} /> OMR Scanner Pro</h1>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 pb-24 relative">
        
        {/* === แท็บสแกน === */}
        {activeTab === 'scan' && (
          <div className="max-w-md mx-auto space-y-4 relative">
            <div className="bg-white p-4 rounded-xl shadow-sm text-center mb-4 border border-slate-100">
              <h2 className="font-bold text-lg text-slate-700 mb-1">โหมดสแกนกระดาษคำตอบ</h2>
              <div className="flex bg-slate-100 p-1 rounded-lg mt-3 w-fit mx-auto">
                <button onClick={() => setExamLevel('junior')} className={`px-5 py-1.5 text-sm font-bold rounded-md transition-all ${examLevel === 'junior' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}>ตรวจ ม.ต้น</button>
                <button onClick={() => setExamLevel('senior')} className={`px-5 py-1.5 text-sm font-bold rounded-md transition-all ${examLevel === 'senior' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}>ตรวจ ม.ปลาย</button>
              </div>
            </div>

            {scanStatus && (
              <div className={`p-3 text-center text-sm font-bold rounded-lg mb-2 ${isScanning ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                {scanStatus}
              </div>
            )}

            <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-xl ring-4 ring-slate-800/10">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-[80%] h-[80%] border-4 rounded-xl relative transition-all duration-300 ${isScanning ? 'border-amber-400 scale-95' : 'border-green-500/60 scale-100'}`}>
                   <Crosshair className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-colors ${isScanning ? 'text-amber-400' : 'text-green-500/50'}`} size={64} />
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleScanClick}
              disabled={isScanning}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isScanning ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-green-600 text-white active:bg-green-700 active:scale-95'}`}
            >
              <Camera size={24} className={isScanning ? 'animate-bounce' : ''} /> 
              {isScanning ? 'กำลังวิเคราะห์...' : `สแกนข้อสอบ (${examLevel === 'junior' ? 'ม.ต้น' : 'ม.ปลาย'})`}
            </button>
          </div>
        )}

        {/* === แท็บตั้งเฉลย === */}
        {activeTab === 'key' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="text-green-600" size={24} />
                  <h2 className="font-bold text-lg">ตั้งค่าเฉลยข้อสอบ</h2>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                  <button onClick={() => setExamLevel('junior')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${examLevel === 'junior' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}>ชุด ม.ต้น</button>
                  <button onClick={() => setExamLevel('senior')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${examLevel === 'senior' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}>ชุด ม.ปลาย</button>
                </div>
              </div>
              
              {/* สรุปคะแนนเต็ม */}
              <div className={`p-3 text-sm rounded-lg mb-4 font-bold flex justify-between ${examLevel === 'junior' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                <span>กำลังบันทึกเฉลย: {examLevel === 'junior' ? 'มัธยมศึกษาตอนต้น' : 'มัธยมศึกษาตอนปลาย'}</span>
                <span>คะแนนเต็ม: {Object.keys(answerKeys[examLevel]).filter(k => answerKeys[examLevel][parseInt(k)] !== '').length} / {TOTAL_QUESTIONS}</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center p-3 border border-slate-200 rounded-xl bg-white">
                    <span className="text-sm font-bold text-slate-500 mb-2">ข้อ {i + 1}</span>
                    <div className="flex gap-1.5">
                      {CHOICES.map(c => (
                        <button key={c} onClick={() => handleKeyToggle(i + 1, c)} className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${answerKeys[examLevel]?.[i + 1] === c ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === แท็บรายชื่อ === */}
        {activeTab === 'classes' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4"><Users className="text-green-600" size={24} /><h2 className="font-bold text-lg">ฐานข้อมูลนักเรียน</h2></div>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                <p className="text-sm font-medium text-slate-700 mb-1">นำเข้ารายชื่อนักเรียน</p>
                <label className="cursor-pointer bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 inline-block mt-2 shadow-sm hover:bg-slate-50">
                  เลือกไฟล์ JSON<input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
            {classes.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
                <h3 className="font-bold border-b pb-2">ข้อมูลห้องเรียนที่โหลดแล้ว ({classes.length} ห้อง)</h3>
                {classes.map((c, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border flex justify-between items-center mt-2">
                    <div className="font-bold text-green-700">{c.className}</div>
                    <div className="text-sm font-black text-slate-700 bg-white px-3 py-1 rounded-full border">{c.students?.length || 0} คน</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === แท็บประวัติ === */}
        {activeTab === 'history' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex justify-between items-center mb-4">
               <h2 className="font-bold text-lg flex items-center gap-2"><History className="text-green-600" /> ประวัติการสแกน</h2>
               {examHistory.length > 0 && (
                 <button onClick={clearHistory} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                   <Trash2 size={16} /> ลบทั้งหมด
                 </button>
               )}
            </div>

            {examHistory.length === 0 ? (
              <div className="bg-white p-10 rounded-xl shadow-sm border text-center">
                <History className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลการตรวจข้อสอบ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {examHistory.map((record) => (
                  <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-green-100 text-green-800 text-xs font-black px-2 py-1 rounded-md">{record.className}</span>
                        <span className="text-slate-500 text-xs">{record.date}</span>
                      </div>
                      <div className="font-bold text-slate-800">{record.studentName} <span className="text-xs font-normal text-slate-500">({record.studentId})</span></div>
                      <div className="text-xs text-slate-500 mt-1">ชุดข้อสอบ: {record.level}</div>
                    </div>
                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                      <div className="text-sm text-slate-500">คะแนนที่ได้</div>
                      <div className="text-2xl font-black text-green-600">{record.score} <span className="text-base text-slate-400 font-medium">/ {record.fullScore}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* === เมนูด้านล่างสุด === */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around pb-2 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-40">
        {[{ id: 'scan', name: 'สแกน', icon: Camera }, { id: 'key', name: 'ตั้งเฉลย', icon: Settings }, { id: 'classes', name: 'รายชื่อ', icon: Users }, { id: 'history', name: 'ประวัติ', icon: History }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3 pt-4 flex flex-col items-center gap-1 ${activeTab === t.id ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <t.icon size={24} /><span className="text-[11px] font-semibold">{t.name}</span>
          </button>
        ))}
      </div>

      {/* === Modal สำหรับบันทึกคะแนน (ทำงานเมื่อกดสแกนเสร็จ) === */}
      {showResultModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle2 /> บันทึกผลการตรวจ</h3>
              <button onClick={() => setShowResultModal(false)} className="text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg border border-amber-200">
                ระบบจำลองคะแนนจากการสแกน คุณครูสามารถแก้ไขคะแนนได้ด้วยตนเอง
              </div>

              {/* เลือกห้อง */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">เลือกห้องเรียน</label>
                <select 
                  className="w-full border border-slate-300 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none"
                  value={selectedClassIdx}
                  onChange={(e) => {
                    setSelectedClassIdx(parseInt(e.target.value));
                    setSelectedStudentIdx(-1);
                  }}
                >
                  <option value={-1}>-- กรุณาเลือกห้องเรียน --</option>
                  {classes.map((c, idx) => (
                    <option key={idx} value={idx}>{c.className}</option>
                  ))}
                </select>
              </div>

              {/* เลือกนักเรียน */}
              {selectedClassIdx >= 0 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">เลือกชื่อนักเรียน</label>
                  <select 
                    className="w-full border border-slate-300 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none"
                    value={selectedStudentIdx}
                    onChange={(e) => setSelectedStudentIdx(parseInt(e.target.value))}
                  >
                    <option value={-1}>-- เลื่อนหาชื่อนักเรียน --</option>
                    {classes[selectedClassIdx].students.map((s: any, idx: number) => (
                      <option key={idx} value={idx}>{s.name} ({s.id})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ช่องใส่คะแนน */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  คะแนนที่ได้ (เต็ม {Object.keys(answerKeys[examLevel]).filter(k => answerKeys[examLevel][parseInt(k)] !== '').length})
                </label>
                <input 
                  type="number" 
                  className="w-full border border-slate-300 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none text-xl font-bold text-center text-green-700"
                  value={currentScore}
                  onChange={(e) => setCurrentScore(parseInt(e.target.value) || 0)}
                  min="0"
                  max={Object.keys(answerKeys[examLevel]).filter(k => answerKeys[examLevel][parseInt(k)] !== '').length}
                />
              </div>
              
              <button 
                onClick={saveResult}
                className="w-full bg-green-600 text-white font-bold text-lg py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-green-700 transition-colors"
              >
                <Save size={20} /> ยืนยันและบันทึกคะแนน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}