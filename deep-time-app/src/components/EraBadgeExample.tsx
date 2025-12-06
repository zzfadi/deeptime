/**
 * EraBadgeExample - A distinctive geological era badge
 * 
 * Aesthetic Direction: "Geological Strata" - layered, earthy, with depth
 * Uses warm earth tones, subtle texture, and a sense of deep time
 */
import { useState } from 'react';

interface EraBadgeProps {
  eraName: string;
  yearsAgo: string;
  color?: string;
}

export function EraBadgeExample({ 
  eraName, 
  yearsAgo, 
  color = '#8B4513' 
}: EraBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="era-badge"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        // Layered strata effect
        background: `
          linear-gradient(
            180deg,
            ${color}22 0%,
            ${color}44 30%,
            ${color}66 60%,
            ${color}88 100%
          )
        `,
        border: `2px solid ${color}`,
        borderRadius: '4px 4px 12px 12px',
        padding: '1rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 8px 24px ${color}44, inset 0 -4px 12px ${color}33`
          : `0 4px 12px ${color}22, inset 0 -2px 8px ${color}22`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Grain texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />
      
      {/* Era name - distinctive typography */}
      <h3
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '1.25rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: '#1a1a1a',
          margin: 0,
          textTransform: 'uppercase',
          position: 'relative',
        }}
      >
        {eraName}
      </h3>
      
      {/* Time indicator - monospace for that scientific feel */}
      <span
        style={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '0.75rem',
          color: '#4a4a4a',
          letterSpacing: '0.1em',
          display: 'block',
          marginTop: '0.25rem',
          position: 'relative',
        }}
      >
        {yearsAgo}
      </span>

      {/* Sediment line decoration */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: isHovered ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}

// Demo component showing multiple eras
export function EraBadgeDemo() {
  const eras = [
    { name: 'Cambrian', years: '538 MYA', color: '#2E8B57' },
    { name: 'Jurassic', years: '201 MYA', color: '#6B8E23' },
    { name: 'Cretaceous', years: '145 MYA', color: '#8B4513' },
    { name: 'Paleogene', years: '66 MYA', color: '#CD853F' },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      gap: '1rem', 
      padding: '2rem',
      background: '#0a0a0a',
      borderRadius: '8px',
    }}>
      {eras.map((era) => (
        <EraBadgeExample
          key={era.name}
          eraName={era.name}
          yearsAgo={era.years}
          color={era.color}
        />
      ))}
    </div>
  );
}

export default EraBadgeExample;
