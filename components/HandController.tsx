import React, { useEffect, useRef, useState } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';
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
    let gestureRecognizer: GestureRecognizer | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("浏览器不支持摄像头访问");
          return;
        }

        // ✅ 使用官方的 GestureRecognizer
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minGestureConfidence: 0.3,  // 手势置信度
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
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
          setError("摄像头权限被拒绝");
        } else if (err.name === 'NotFoundError') {
          setError("未找到摄像头设备");
        } else {
          setError("无法访问摄像头: " + (err.message || err.name));
        }
      }
    };

    let lastVideoTime = -1;
    let lastGestureType: string | null = null;
    let lastWristX: number | null = null;
    
    // 状态平滑
    const gestureHistory: string[] = [];
    const gestureHistorySize = 5;
    const wristXHistory: number[] = [];
    const wristXHistorySize = 8;
    
    const predictWebcam = () => {
      if (videoRef.current && gestureRecognizer) {
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          const startTimeMs = performance.now();
          
          // ✅ 使用官方的手势识别
          const result = gestureRecognizer.recognizeForVideo(videoRef.current, startTimeMs);
          
          // 检查是否有手部
          const hasHand = result.landmarks && result.landmarks.length > 0;
          
          if (hasHand && result.gestures && result.gestures.length > 0) {
            const gestures = result.gestures[0]; // 第一只手的手势
            const landmarks = result.landmarks[0];
            
            // ✅ 1. 使用官方手势识别结果
            let confirmedGesture: string | null = null;
            
            if (gestures.length > 0) {
              const topGesture = gestures[0]; // 置信度最高的手势
              const gestureName = topGesture.categoryName; // "Open_Palm", "Closed_Fist", "Pointing_Up" 等
              const confidence = topGesture.score;
              
              console.log(`🎯 识别到手势: ${gestureName} (置信度: ${confidence.toFixed(2)})`);
              
              // 添加到历史记录（平滑）
              if (confidence > 0.5) {  // 只记录置信度高的
                gestureHistory.push(gestureName);
                if (gestureHistory.length > gestureHistorySize) {
                  gestureHistory.shift();
                }
              }
              
              // 多数投票确认手势
              const gestureCount = new Map<string, number>();
              for (const g of gestureHistory) {
                gestureCount.set(g, (gestureCount.get(g) || 0) + 1);
              }
              
              let maxCount = 0;
              for (const [gesture, count] of gestureCount.entries()) {
                if (count > maxCount && count >= gestureHistorySize * 0.6) {
                  confirmedGesture = gesture;
                  maxCount = count;
                }
              }
              
              // ✅ 2. 手势触发逻辑
              if (confirmedGesture && lastGestureType !== confirmedGesture) {
                console.log(`✅ 确认手势变化: ${lastGestureType} → ${confirmedGesture}`);
                
                // 官方手势类型文档：
                // - "Open_Palm": 张开手掌
                // - "Closed_Fist": 握拳
                // - "Pointing_Up": 食指指向
                // - "Thumbs_Up": 竖大拇指
                // - "Victory": V手势
                // - "ILoveYou": 爱你手势
                
                if (confirmedGesture === 'Open_Palm' && lastGestureType === 'Closed_Fist') {
                  onGesture(ParticleState.SCATTERED);
                  console.log('🎄 打开圣诞树');
                } else if (confirmedGesture === 'Closed_Fist' && lastGestureType === 'Open_Palm') {
                  onGesture(ParticleState.TREE_SHAPE);
                  console.log('🎄 闭合圣诞树');
                }
                
                lastGestureType = confirmedGesture;
              }
            }
            
            // ✅ 3. 旋转控制（基于手腕位置）
            const wrist = landmarks[0];
            
            // 只在张开手掌时允许旋转
            const canRotate = confirmedGesture === 'Open_Palm' || 
                              (gestureHistory.length > 0 && 
                               gestureHistory.slice(-2).includes('Open_Palm'));
            
            if (canRotate) {
              const currentWristX = 1.0 - wrist.x; // 反转坐标
              
              wristXHistory.push(currentWristX);
              if (wristXHistory.length > wristXHistorySize) {
                wristXHistory.shift();
              }
              
              // 卡尔曼滤波平滑（比移动平均更好）
              const smoothedX = kalmanFilter(wristXHistory);
              
              if (lastWristX !== null) {
                const rawDeltaX = smoothedX - lastWristX;
                const deadZone = 0.003;
                
                if (Math.abs(rawDeltaX) < deadZone) {
                  onRotation(0);
                } else {
                  // 使用非线性映射，低速时灵敏，高速时平缓
                  const rotation = Math.sign(rawDeltaX) * 
                                   Math.pow(Math.abs(rawDeltaX) * 60, 0.8);
                  const clampedRotation = Math.max(-3, Math.min(3, rotation));
                  onRotation(clampedRotation);
                }
              }
              
              lastWristX = smoothedX;
            } else {
              lastWristX = null;
              wristXHistory.length = 0;
              onRotation(0);
            }
          } else {
            // 没有检测到手
            gestureHistory.length = 0;
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
      if (gestureRecognizer) gestureRecognizer.close();
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

// 卡尔曼滤波函数
function kalmanFilter(values: number[], processNoise = 0.01, measurementNoise = 0.1): number {
  if (values.length === 0) return 0;
  
  let estimate = values[0];
  let error = 1;
  
  for (let i = 1; i < values.length; i++) {
    // 预测
    let priorEstimate = estimate;
    let priorError = error + processNoise;
    
    // 更新
    let kalmanGain = priorError / (priorError + measurementNoise);
    estimate = priorEstimate + kalmanGain * (values[i] - priorEstimate);
    error = (1 - kalmanGain) * priorError;
  }
  
  return estimate;
}
