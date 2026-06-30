export function LightningIcon({ className = "", pathLength = 1, opacity = 1, fill = "none", stroke = "currentColor", strokeWidth = 2 }: { className?: string, pathLength?: any, opacity?: any, fill?: string, stroke?: string, strokeWidth?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
