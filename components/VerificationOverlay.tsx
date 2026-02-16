
import React, { useEffect, useState, useRef } from 'react';

interface VerificationOverlayProps {
  onVerifySuccess: () => void;
  t: (key: string) => string;
}

// Signal types
interface MouseSignal {
  x: number;
  y: number;
  time: number;
}

export const VerificationOverlay: React.FC<VerificationOverlayProps> = ({ onVerifySuccess, t }) => {
  const [riskScore, setRiskScore] = useState(0);
  const [status, setStatus] = useState<'analyzing' | 'verifying' | 'success'>('analyzing');
  const [message, setMessage] = useState("INITIALIZING NEURAL SENSORS...");
  
  const signalsRef = useRef<MouseSignal[]>([]);
  const lastCheckRef = useRef<number>(Date.now());
  const isVerifiedRef = useRef(false);

  // Constants for Heuristics
  const REQUIRED_SAMPLES = 20; // Need at least this many movement points
  const MIN_SCORE_THRESHOLD = 0.75; // 0.0 to 1.0
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isVerifiedRef.current) return;

      const now = Date.now();
      // Sample rate limiting (approx 60fps)
      if (now - lastCheckRef.current < 16) return;
      lastCheckRef.current = now;

      const newSignal = { x: e.clientX, y: e.clientY, time: now };
      signalsRef.current.push(newSignal);

      // Keep only last 50 signals for sliding window analysis
      if (signalsRef.current.length > 50) {
        signalsRef.current.shift();
      }

      analyzeSignals();
    };

    const analyzeSignals = () => {
      const data = signalsRef.current;
      if (data.length < REQUIRED_SAMPLES) {
        setMessage(`GATHERING BIOMETRIC DATA... ${(data.length / REQUIRED_SAMPLES * 100).toFixed(0)}%`);
        return;
      }

      // --- 1. Movement Entropy (Linearity Analysis) ---
      // Bots often move in straight lines. Humans move in arcs.
      let totalAngleChange = 0;
      let totalDistance = 0;

      for (let i = 2; i < data.length; i++) {
        const p1 = data[i - 2];
        const p2 = data[i - 1];
        const p3 = data[i];

        const vec1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const vec2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = vec1.x * vec2.x + vec1.y * vec2.y;
        const mag1 = Math.sqrt(vec1.x ** 2 + vec1.y ** 2);
        const mag2 = Math.sqrt(vec2.x ** 2 + vec2.y ** 2);

        if (mag1 > 0 && mag2 > 0) {
          const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
          const angle = Math.acos(cosTheta); // Radians
          totalAngleChange += angle;
        }
        totalDistance += mag2;
      }

      // Average angle change per step. 
      // 0 = Straight line (Bot-like). High value = Jittery/Curved (Human-like).
      const entropyScore = Math.min(1, (totalAngleChange / data.length) * 5); 

      // --- 2. Velocity Variance ---
      // Bots usually have constant speed. Humans accelerate and decelerate.
      let velocities: number[] = [];
      for (let i = 1; i < data.length; i++) {
        const dist = Math.sqrt((data[i].x - data[i-1].x)**2 + (data[i].y - data[i-1].y)**2);
        const time = data[i].time - data[i-1].time;
        if (time > 0) velocities.push(dist / time);
      }

      let velocityVariance = 0;
      if (velocities.length > 0) {
        const meanV = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const variance = velocities.reduce((a, b) => a + (b - meanV) ** 2, 0) / velocities.length;
        // Normalize variance somewhat arbitrarily for scoring
        velocityVariance = Math.min(1, variance / 5); 
      }

      // --- Final Score Calculation ---
      // Weighted average: Entropy (60%) + Velocity Variance (40%)
      const finalScore = (entropyScore * 0.6) + (velocityVariance * 0.4);
      
      setRiskScore(finalScore);

      if (finalScore > MIN_SCORE_THRESHOLD) {
        passVerification();
      } else {
        setMessage("DETECTING ANOMALIES... PLEASE MOVE CURSOR NATURALLY");
      }
    };

    const passVerification = () => {
      if (isVerifiedRef.current) return;
      isVerifiedRef.current = true;
      setStatus('success');
      setMessage("HUMAN PATTERN CONFIRMED");
      
      // Remove listeners
      window.removeEventListener('mousemove', handleMouseMove);
      
      setTimeout(() => {
        localStorage.removeItem('oceep_verify_attempts');
        localStorage.removeItem('oceep_security_level');
        localStorage.removeItem('oceep_lockout_end');
        onVerifySuccess();
      }, 800);
    };

    // Attach passive listeners
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onVerifySuccess]);

  // Visualizing the risk score
  const barWidth = `${Math.min(100, riskScore * 100)}%`;
  const barColor = riskScore > MIN_SCORE_THRESHOLD ? 'bg-emerald-500' : (riskScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in text-white p-4 cursor-crosshair">
      <div className="w-full max-w-sm bg-[#0f0f12] border border-blue-900/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] rounded-2xl p-8 relative overflow-hidden flex flex-col items-center">
        
        {/* Radar Scan Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(59,130,246,0.05)_100%)]"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_15px_#3b82f6] animate-[scan_2s_linear_infinite]"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-900/10 rounded-full flex items-center justify-center border border-blue-500/30 relative">
             {status === 'success' ? (
                <svg className="w-10 h-10 text-emerald-500 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
             ) : (
                <>
                  <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                  <svg className="w-8 h-8 text-blue-400 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                </>
             )}
          </div>
          
          <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-2 font-mono">
              SYSTEM SECURITY
          </h2>
          
          <div className="h-10 flex items-center justify-center">
             <p className="text-[10px] text-blue-300 font-mono uppercase tracking-wider animate-pulse">
               {message}
             </p>
          </div>
        </div>

        {/* Analysis Visualization */}
        <div className="w-full bg-gray-900 rounded-full h-1.5 mb-2 overflow-hidden border border-gray-800">
            <div 
                className={`h-full transition-all duration-300 ease-out ${barColor}`} 
                style={{ width: barWidth }}
            ></div>
        </div>
        <div className="flex justify-between w-full text-[9px] text-gray-600 font-mono mb-6 uppercase">
            <span>Bot Probability</span>
            <span>Human Probability</span>
        </div>

        <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/10 w-full">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                <div className="text-[10px] text-gray-400 leading-relaxed">
                    <strong className="text-blue-300">Behavioral Analysis Active.</strong>
                    <br/>
                    Please move your cursor naturally to calibrate user identity.
                </div>
            </div>
        </div>
        
        <div className="absolute bottom-2 right-4 text-[9px] text-gray-700 font-mono">
            SEC.LAYER.4 // HEURISTIC
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
