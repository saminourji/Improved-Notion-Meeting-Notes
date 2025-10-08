"use client";

import React, { useState, useEffect } from 'react';

interface DotAudioVisualizationProps {
  isActive: boolean;
  analyser: AnalyserNode | null;
}

export const DotAudioVisualization: React.FC<DotAudioVisualizationProps> = ({ 
  isActive, 
  analyser 
}) => {
  const [dots, setDots] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive || !analyser) {
      setDots([]);
      return;
    }

    const updateVisualization = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      // Create dots from frequency data - fewer dots to prevent overflow
      const dotCount = 45; // Reduced from 65 to prevent UI overflow
      const newDots: number[] = [];
      
      for (let i = 0; i < dotCount; i++) {
        // Map frequency data to dots with better distribution
        const dataIndex = Math.floor((i / dotCount) * bufferLength);
        const frequency = dataArray[dataIndex];
        
        // Normalize to 0-1 range
        const normalizedValue = Math.min(frequency / 255, 1);
        newDots.push(normalizedValue);
      }
      
      setDots(newDots);
      
      if (isActive) {
        requestAnimationFrame(updateVisualization);
      }
    };

    updateVisualization();
  }, [isActive, analyser]);

  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-1 ml-6 mr-auto h-6">
      {dots.map((intensity, index) => (
        <div
          key={index}
          className="flex items-center justify-center"
          style={{ width: '3px', height: '24px' }}
        >
          {/* Single centered line that expands bidirectionally */}
          <div
            className="rounded-full transition-all duration-75"
            style={{
              width: '2px',
              height: `${Math.max(2, intensity * 20)}px`, // Single line that grows from center
              backgroundColor: '#9B9B9B', // Same gray as @Today
            }}
          />
        </div>
      ))}
    </div>
  );
};
