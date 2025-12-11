import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { ParticleState } from '../types';

interface HandControllerProps {
  onGesture: (state: ParticleState | null) => void;
  onRotation: (rotation: number) => void;
}

export const HandController: React.FC<HandControllerProps> = ({ onGesture, onRotation }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        // 检查是否支持 mediaDevices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("浏览器不支持摄像头访问");
          return;
        }

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLoaded(true);
        startWebcam();
      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
        setError("MediaPipe 加载失败");
      }
    };

    const startWebcam = async () => {
      try {
        if (!videoRef.current) {
          setError("视频元素未初始化");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
          videoRef.current.play().catch(e => {
            console.error("视频播放失败:", e);
          });
        }
      } catch (err: any) {
        console.error("Error accessing webcam:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("摄像头权限被拒绝，请允许访问摄像头");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("未找到摄像头设备");
        } else {
          setError("无法访问摄像头: " + (err.message || err.name));
        }
      }
    };

    let lastVideoTime = -1;
    let lastHandState: 'fist' | 'open' | null = null;
    let lastWristX: number | null = null;
    
    // 平滑滤波：使用滑动窗口
    const stateHistory: ('fist' | 'open')[] = [];
    const stateHistorySize = 5; // 需要连续5帧确认状态
    const wristXHistory: number[] = [];
    const wristXHistorySize = 3; // 手腕位置平滑窗口
    
    const predictWebcam = () => {
      if (videoRef.current && handLandmarker) {
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          const startTimeMs = performance.now();
          const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            
            // 1. Gesture Detection - 检测手的状态（改进算法）
            const wrist = landmarks[0];
            const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
            
            // 改进：检查每个手指的关节角度，更准确
            let extendedFingers = 0;
            const fingerJoints = [
              [5, 6, 8],   // 食指
              [9, 10, 12], // 中指
              [13, 14, 16], // 无名指
              [17, 18, 20]  // 小指
            ];
            
            fingerJoints.forEach(([base, mid, tip]) => {
              const basePoint = landmarks[base];
              const midPoint = landmarks[mid];
              const tipPoint = landmarks[tip];
              
              // 计算手指是否伸直：指尖应该比中间关节更远离手腕
              const midDist = Math.sqrt(
                Math.pow(midPoint.x - wrist.x, 2) + 
                Math.pow(midPoint.y - wrist.y, 2)
              );
              const tipDist = Math.sqrt(
                Math.pow(tipPoint.x - wrist.x, 2) + 
                Math.pow(tipPoint.y - wrist.y, 2)
              );
              
              // 如果指尖比中间关节更远，说明手指伸直
              if (tipDist > midDist * 1.1) {
                extendedFingers++;
              }
            });

            // 判断当前手的状态
            const currentHandState: 'fist' | 'open' = extendedFingers <= 1 ? 'fist' : 'open';
            
            // 添加到历史记录
            stateHistory.push(currentHandState);
            if (stateHistory.length > stateHistorySize) {
              stateHistory.shift();
            }
            
            // 状态确认：需要连续多帧都是同一状态才触发
            const confirmedState = stateHistory.length >= stateHistorySize && 
              stateHistory.every(s => s === currentHandState) ? currentHandState : null;
            
            // 2. 只在确认状态变化时触发
            if (confirmedState && lastHandState !== confirmedState) {
              if (confirmedState === 'open' && lastHandState === 'fist') {
                // 从握拳变为张开 → 散开
                onGesture(ParticleState.SCATTERED);
              } else if (confirmedState === 'fist' && lastHandState === 'open') {
                // 从张开变为握拳 → 闭合
                onGesture(ParticleState.TREE_SHAPE);
              }
              lastHandState = confirmedState;
            }

            // 3. Rotation - 检测手部左右移动的速度（平滑处理）
            if (confirmedState === 'open') {
              const currentWristX = wrist.x; // 当前手腕 x 位置（0-1）
              
              // 添加到平滑窗口
              wristXHistory.push(currentWristX);
              if (wristXHistory.length > wristXHistorySize) {
                wristXHistory.shift();
              }
              
              // 计算平滑后的位置（移动平均）
              const smoothedX = wristXHistory.reduce((a, b) => a + b, 0) / wristXHistory.length;
              
              if (lastWristX !== null) {
                // 计算移动速度（使用平滑后的位置）
                const deltaX = (smoothedX - lastWristX) * 50;
                // 限制最大速度
                const rotation = Math.max(-6, Math.min(6, deltaX));
                onRotation(rotation);
              } else {
                onRotation(0);
              }
              
              lastWristX = smoothedX;
            } else {
              // 握拳时重置位置跟踪
              lastWristX = null;
              wristXHistory.length = 0;
              onRotation(0);
            }
          } else {
            // 没有检测到手，重置状态
            lastHandState = null;
            stateHistory.length = 0;
            wristXHistory.length = 0;
            onRotation(0);
          }
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [onGesture, onRotation]);

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-auto">
      <div className={`
        relative w-32 h-24 bg-black/50 rounded-lg overflow-hidden border border-pink-500/30
        transition-opacity duration-1000 ${loaded && !error ? 'opacity-100' : 'opacity-50'}
      `}>
         <video 
           ref={videoRef}
           className="w-full h-full object-cover transform -scale-x-100"
           autoPlay
           playsInline
           muted
         />
         <div className="absolute top-1 left-2 text-[8px] text-pink-200 uppercase tracking-widest bg-black/40 px-1 rounded">
            Gesture Control
         </div>
         {error && (
           <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-1">
             <div className="text-[6px] text-red-300 text-center leading-tight">
               {error}
             </div>
           </div>
         )}
      </div>
    </div>
  );
};
