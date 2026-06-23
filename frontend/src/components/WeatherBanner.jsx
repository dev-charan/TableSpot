import { CloudRain, Sun, Cloud, Snowflake, Zap } from 'lucide-react';

const config = {
  rainy: {
    icon: CloudRain,
    text: "Rainy day? Perfect for a cozy dine-in experience!",
    sub: "We've highlighted the best indoor restaurants for you.",
    bg: 'from-blue-900/40 to-dark-800',
    color: 'text-blue-300',
  },
  stormy: {
    icon: Zap,
    text: "Stay in and dine! Storm outside, warmth inside.",
    sub: "Book a table and skip the weather.",
    bg: 'from-purple-900/40 to-dark-800',
    color: 'text-purple-300',
  },
  snowy: {
    icon: Snowflake,
    text: "Cold outside? Warm up with a great meal!",
    sub: "Cozy restaurants waiting for you.",
    bg: 'from-cyan-900/40 to-dark-800',
    color: 'text-cyan-300',
  },
  cloudy: {
    icon: Cloud,
    text: "Cloudy skies — great day for brunch!",
    sub: "Explore top-rated spots near you.",
    bg: 'from-gray-800/60 to-dark-800',
    color: 'text-gray-300',
  },
  clear: {
    icon: Sun,
    text: "Beautiful day to dine out!",
    sub: "Check out outdoor seating options.",
    bg: 'from-amber-900/30 to-dark-800',
    color: 'text-amber-300',
  },
};

export default function WeatherBanner({ weather }) {
  if (!weather) return null;
  const cfg = config[weather.condition] || config.clear;
  const Icon = cfg.icon;

  return (
    <div className={`bg-gradient-to-r ${cfg.bg} border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4 animate-fade-in`}>
      <div className={`${cfg.color} shrink-0`}>
        <Icon size={32} />
      </div>
      <div>
        <p className={`font-semibold text-sm ${cfg.color}`}>{cfg.text}</p>
        <p className="text-xs text-white/50 mt-0.5">{cfg.sub}</p>
      </div>
      {weather.temp !== undefined && (
        <div className="ml-auto text-right shrink-0">
          <p className="text-2xl font-bold">{Math.round(weather.temp)}°C</p>
        </div>
      )}
    </div>
  );
}
