
import React, { useRef, useEffect } from 'react';

export interface WeatherData {
  location: string;
  current: {
    temp: number;
    unit: string;
    condition: string;
    desc: string;
    high?: number;
    low?: number;
  };
  hourly: Array<{
    time: string;
    temp: number;
    icon: string;
  }>;
  daily: Array<{
    day: string;
    icon: string;
    high: number;
    low: number;
    condition?: string;
  }>;
}

interface WeatherCardProps {
  data: WeatherData;
  theme?: string;
}

const getWeatherIcon = (iconCode: string) => {
  // Simple mapping for demonstration. Ideally use specific SVG paths or an icon set.
  const lower = iconCode.toLowerCase();
  if (lower.includes('sun') || lower.includes('clear')) return (
    <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
  if (lower.includes('cloud')) return (
    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
  if (lower.includes('rain')) return (
    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
  if (lower.includes('storm')) return (
    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
    </svg>
  );
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ data, theme }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll chart to start if needed (optional)
  useEffect(() => {
      // if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  // Calculate chart path for hourly temps
  const renderHourlyChart = () => {
      if (!data.hourly || data.hourly.length === 0) return null;
      
      const temps = data.hourly.map(h => h.temp);
      const minTemp = Math.min(...temps) - 2;
      const maxTemp = Math.max(...temps) + 2;
      const range = maxTemp - minTemp || 1;
      
      const width = 600; // Fixed simplified width for calculation
      const height = 60;
      const stepX = width / (data.hourly.length - 1);
      
      let pathD = `M0,${height} `;
      const points = data.hourly.map((h, i) => {
          const x = i * stepX;
          const y = height - ((h.temp - minTemp) / range) * height;
          return { x, y };
      });

      // Start area path
      pathD += `L${points[0].x},${points[0].y} `;
      
      // Catmull-Rom or simple line join
      points.forEach((p, i) => {
          if (i > 0) pathD += `L${p.x},${p.y} `;
      });

      pathD += `L${width},${height} Z`;

      // Line path (stroke only)
      let lineD = `M${points[0].x},${points[0].y} `;
      points.forEach((p, i) => {
          if (i > 0) lineD += `L${p.x},${p.y} `;
      });

      return (
          <div className="relative w-[600px] h-[100px] mt-4">
              <svg viewBox={`0 0 ${width} ${height + 40}`} className="w-full h-full overflow-visible">
                  <defs>
                      <linearGradient id="tempGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255, 165, 0, 0.3)" />
                          <stop offset="100%" stopColor="rgba(255, 165, 0, 0)" />
                      </linearGradient>
                  </defs>
                  
                  {/* Fill Area */}
                  <path d={pathD} fill="url(#tempGradient)" />
                  
                  {/* Stroke Line */}
                  <path d={lineD} fill="none" stroke="orange" strokeWidth="2" />

                  {/* Points & Labels */}
                  {points.map((p, i) => (
                      <g key={i}>
                          <circle cx={p.x} cy={p.y} r="3" fill="#1f1f1f" stroke="orange" strokeWidth="2" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                              {data.hourly[i].temp}°
                          </text>
                          <text x={p.x} y={height + 25} textAnchor="middle" fill="#9ca3af" fontSize="10">
                              {data.hourly[i].time}
                          </text>
                      </g>
                  ))}
              </svg>
          </div>
      );
  };

  return (
    <div className={`mt-4 mb-6 rounded-3xl overflow-hidden shadow-2xl font-sans text-white border border-white/10 bg-[#1f1f23]`}>
      <div className="p-6 bg-gradient-to-br from-[#2a2a30] to-[#1f1f23]">
        {/* Header: Location */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            {data.location}
        </h2>

        {/* Main Info */}
        <div className="flex flex-col mb-8">
            <div className="flex items-start">
                <span className="text-7xl font-bold tracking-tighter">{data.current.temp}</span>
                <span className="text-2xl mt-2 text-gray-400">°{data.current.unit || 'C'}</span>
            </div>
            <div className="text-lg font-medium text-gray-300 mt-1">{data.current.desc || data.current.condition}</div>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>H: {data.current.high}°</span>
                <span>L: {data.current.low}°</span>
            </div>
        </div>

        {/* Hourly Scroll */}
        <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide" ref={scrollRef}>
            <div className="min-w-fit pr-4">
               {renderHourlyChart()}
            </div>
        </div>

        {/* Daily Forecast */}
        <div className="space-y-4">
            {data.daily.map((day, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                    <div className="w-16 font-medium text-gray-300">{day.day}</div>
                    <div className="flex-1 flex justify-center">{getWeatherIcon(day.icon || day.condition || '')}</div>
                    <div className="flex gap-4 w-32 justify-end text-sm">
                        <span className="font-bold text-white w-8 text-right">{day.high}°</span>
                        <span className="text-gray-500 w-8 text-right">{day.low}°</span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
