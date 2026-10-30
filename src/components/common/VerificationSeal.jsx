import React from 'react';

/**
 * VerificationSeal - Authentic Government & Registry Inked Seal
 * Renders ONLY on listings with status === 'verified'
 */
export const VerificationSeal = ({ 
  sealId = "MH-NGP-2026-0842", 
  size = "md", // "sm" | "md" | "lg"
  showLabel = true,
  className = ""
}) => {
  const sizeClasses = {
    sm: "w-16 h-16 text-[7px]",
    md: "w-24 h-24 text-[9px]",
    lg: "w-32 h-32 text-[11px]"
  };

  const svgDimensions = {
    sm: 64,
    md: 96,
    lg: 128
  };

  const dim = svgDimensions[size] || 96;

  return (
    <div className={`inline-flex flex-col items-center ${className}`} title={`Officially Verified by Rentify Registry: ${sealId}`}>
      <div className={`relative ${sizeClasses[size] || sizeClasses.md} select-none transform -rotate-3 transition-transform hover:rotate-0`}>
        <svg 
          viewBox="0 0 100 100" 
          width={dim} 
          height={dim} 
          className="w-full h-full text-seal drop-shadow-sm filter contrast-125"
        >
          {/* Subtle stamped background */}
          <circle cx="50" cy="50" r="48" fill="#F0F7F5" stroke="#0F4C42" strokeWidth="2.5" />
          
          {/* Inner serrated / dashed ring resembling an official notarized registry seal */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="#0F4C42" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="50" cy="50" r="32" fill="#E7F2EE" stroke="#0F4C42" strokeWidth="1.5" />

          {/* Circular curved text path */}
          <defs>
            <path
              id={`sealCirclePath-${sealId}`}
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
            />
          </defs>

          <text className="font-mono font-bold fill-seal uppercase" style={{ fontSize: '7.5px', letterSpacing: '2.2px' }}>
            <textPath href={`#sealCirclePath-${sealId}`} startOffset="50%" textAnchor="middle">
              RENTIFY VERIFIED • TITLE MATCHED •
            </textPath>
          </text>

          {/* Center Checkmark with Seal Crest */}
          <g transform="translate(50, 50)">
            {/* Center shield / crest outline */}
            <path 
              d="M -12,-8 L 12,-8 L 12,2 Q 12,12 0,16 Q -12,12 -12,2 Z" 
              fill="#0F4C42" 
              opacity="0.12"
            />
            {/* Central Stamp Checkmark */}
            <path 
              d="M -7,0 L -2,5 L 8,-6" 
              fill="none" 
              stroke="#0F4C42" 
              strokeWidth="3.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </g>

          {/* Tiny stars */}
          <circle cx="16" cy="50" r="1.5" fill="#0F4C42" />
          <circle cx="84" cy="50" r="1.5" fill="#0F4C42" />
        </svg>
      </div>

      {showLabel && (
        <div className="mt-1 text-center">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-seal uppercase bg-seal-tint px-1.5 py-0.5 rounded border border-seal/30">
            {sealId}
          </span>
        </div>
      )}
    </div>
  );
};
