
import React, { useState } from 'react';

// --- Interfaces ---

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: string;
  changePercent: string;
  isUp: boolean;
  high?: number;
  low?: number;
}

export interface CurrencyData {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
}

export interface SportData {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | string;
  awayScore: number | string;
  status: string;
  startTime?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

export interface FlightData {
  airline: string;
  flightNumber: string;
  departure: { code: string; time: string; city: string };
  arrival: { code: string; time: string; city: string };
  duration: string;
  price: string;
}

export interface CalcData {
  expression: string;
  result: string;
}

export interface TimeData {
  location: string;
  time: string;
  date: string;
  timezone: string;
}

interface CardProps<T> {
  data: T;
  theme?: string;
  onSend?: (text: string) => void;
}

// --- Constants ---
const FIAT_CURRENCIES = [
  "USD", "EUR", "VND", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY", "HKD",
  "NZD", "SGD", "KRW", "INR", "THB", "IDR", "MYR", "PHP", "TWD", "RUB"
];

// --- Components ---

export const StockCard: React.FC<CardProps<StockData>> = ({ data, theme }) => {
  if (!data) return null;
  const isUp = data.isUp;
  const colorClass = isUp ? 'text-green-400' : 'text-red-400';
  const bgClass = isUp ? 'bg-green-500/10' : 'bg-red-500/10';
  const borderClass = isUp ? 'border-green-500/20' : 'border-red-500/20';

  return (
    <div className={`mt-4 mb-4 rounded-2xl overflow-hidden border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1f1f23] border-white/10'} shadow-lg w-full max-w-full`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
               <h3 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.symbol}</h3>
               <span className={`text-xs px-2 py-0.5 rounded bg-gray-500/10 text-gray-500 font-bold`}>{data.currency}</span>
            </div>
            <p className="text-sm text-gray-500">{data.name}</p>
          </div>
          <div className={`px-2 py-1 rounded-lg ${bgClass} ${borderClass} border text-sm font-bold ${colorClass} flex items-center`}>
             {isUp ? '▲' : '▼'} {data.changePercent}
          </div>
        </div>
        
        <div className="flex items-baseline gap-2 mb-4">
           <span className={`text-4xl font-bold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.price?.toLocaleString()}</span>
           <span className={`text-sm font-medium ${colorClass}`}>{data.change}</span>
        </div>

        {(data.high || data.low) && (
            <div className="flex justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 dark:border-white/5">
                <span>L: {data.low}</span>
                <span>H: {data.high}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export const CurrencyCard: React.FC<CardProps<CurrencyData>> = ({ data, theme, onSend }) => {
  if (!data) return null;

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCurrency = e.target.value;
      if (newCurrency !== data.toCurrency && onSend) {
          onSend(`Convert ${data.fromAmount} ${data.fromCurrency} to ${newCurrency}`);
      }
  };

  return (
    <div className={`mt-4 mb-4 rounded-2xl overflow-hidden border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1f1f23] border-white/10'} shadow-lg w-full max-w-full`}>
      <div className="p-5">
         <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Currency Conversion</div>
         
         <div className="flex flex-col gap-4">
             <div>
                 <div className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {data.fromAmount?.toLocaleString()} <span className="text-lg text-gray-500 font-medium">{data.fromCurrency}</span>
                 </div>
                 <div className="text-gray-400 text-sm my-1">=</div>
                 <div className={`flex items-center gap-3 text-3xl font-bold ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                    <span>{data.toAmount?.toLocaleString()}</span>
                    
                    {/* Currency Selector */}
                    <div className="relative inline-block">
                        <select 
                            value={data.toCurrency}
                            onChange={handleCurrencyChange}
                            className={`text-lg font-medium bg-transparent border border-gray-500/30 rounded-lg py-1 pl-2 pr-6 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
                        >
                            {FIAT_CURRENCIES.map(curr => (
                                <option key={curr} value={curr} className="text-black">{curr}</option>
                            ))}
                            {/* Fallback if original currency isn't in list */}
                            {!FIAT_CURRENCIES.includes(data.toCurrency) && (
                                <option value={data.toCurrency} className="text-black">{data.toCurrency}</option>
                            )}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                 </div>
             </div>
             
             <div className="pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500">
                 1 {data.fromCurrency} = {data.rate?.toLocaleString()} {data.toCurrency}
             </div>
         </div>
      </div>
    </div>
  );
};

export const SportCard: React.FC<CardProps<SportData>> = ({ data, theme }) => {
  if (!data) return null;
  
  const statusStr = data.status || '';
  const isLive = statusStr.toLowerCase().includes('live') || statusStr.includes("'");
  
  return (
    <div className={`mt-4 mb-4 rounded-2xl overflow-hidden border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1f1f23] border-white/10'} shadow-lg w-full max-w-full`}>
       <div className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-white/5'} border-b border-gray-100 dark:border-white/5 flex justify-between items-center`}>
           <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{data.league}</span>
           {isLive && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> LIVE</span>}
           {!isLive && <span className="text-xs text-gray-500">{data.status}</span>}
       </div>
       
       <div className="p-6 flex items-center justify-between">
           <div className="flex flex-col items-center flex-1">
               {data.homeTeamLogo ? (
                   <img src={data.homeTeamLogo} alt={data.homeTeam} className="w-12 h-12 mb-2 object-contain drop-shadow-md bg-white/5 rounded-full p-1" />
               ) : (
                   <div className="w-12 h-12 rounded-full bg-gray-200/20 mb-2 flex items-center justify-center text-lg font-bold border border-white/10">
                       {data.homeTeam?.charAt(0)}
                   </div>
               )}
               <span className={`text-sm font-bold text-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.homeTeam}</span>
           </div>
           
           <div className="flex items-center gap-3 px-4">
               <span className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.homeScore}</span>
               <span className="text-gray-400 font-medium">-</span>
               <span className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.awayScore}</span>
           </div>

           <div className="flex flex-col items-center flex-1">
               {data.awayTeamLogo ? (
                   <img src={data.awayTeamLogo} alt={data.awayTeam} className="w-12 h-12 mb-2 object-contain drop-shadow-md bg-white/5 rounded-full p-1" />
               ) : (
                   <div className="w-12 h-12 rounded-full bg-gray-200/20 mb-2 flex items-center justify-center text-lg font-bold border border-white/10">
                       {data.awayTeam?.charAt(0)}
                   </div>
               )}
               <span className={`text-sm font-bold text-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.awayTeam}</span>
           </div>
       </div>
       
       {data.startTime && (
           <div className="px-4 py-2 text-center text-xs text-gray-500 border-t border-gray-100 dark:border-white/5">
               Start: {new Date(data.startTime).toLocaleString()}
           </div>
       )}
    </div>
  );
};

export const FlightCard: React.FC<CardProps<FlightData>> = ({ data, theme }) => {
  if (!data) return null;
  return (
    <div className={`mt-4 mb-4 rounded-2xl overflow-hidden border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1f1f23] border-white/10'} shadow-lg w-full max-w-full`}>
        <div className="p-5">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    <span className={`font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.airline}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">{data.flightNumber}</span>
                </div>
                <div className="text-lg font-bold text-green-500">{data.price}</div>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-left">
                    <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.departure?.time}</div>
                    <div className="text-lg font-mono text-blue-400">{data.departure?.code}</div>
                    <div className="text-xs text-gray-500">{data.departure?.city}</div>
                </div>

                <div className="flex-1 flex flex-col items-center px-4">
                    <div className="text-xs text-gray-500 mb-1">{data.duration}</div>
                    <div className="w-full h-px bg-gray-300 dark:bg-gray-700 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                </div>

                <div className="text-right">
                    <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{data.arrival?.time}</div>
                    <div className="text-lg font-mono text-blue-400">{data.arrival?.code}</div>
                    <div className="text-xs text-gray-500">{data.arrival?.city}</div>
                </div>
            </div>
        </div>
    </div>
  );
};

export const CalcCard: React.FC<CardProps<CalcData>> = ({ data, theme }) => {
  if (!data) return null;
  return (
    <div className={`mt-4 mb-4 rounded-xl overflow-hidden border ${theme === 'light' ? 'bg-gray-100 border-gray-300' : 'bg-[#2a2a30] border-gray-700'} shadow-lg w-full max-w-full`}>
        <div className="p-4">
            <div className="text-right text-gray-500 text-sm mb-1 font-mono">{data.expression} =</div>
            <div className={`text-right text-3xl font-bold font-mono ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {data.result}
            </div>
        </div>
    </div>
  );
};

export const TimeCard: React.FC<CardProps<TimeData>> = ({ data, theme }) => {
    if (!data) return null;
    return (
      <div className={`mt-4 mb-4 rounded-2xl overflow-hidden border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1f1f23] border-white/10'} shadow-lg w-full max-w-full`}>
          <div className="p-5 flex flex-col items-center text-center">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{data.location}</div>
              <div className={`text-4xl font-bold mb-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {data.time}
              </div>
              <div className="text-sm text-gray-400 font-medium">{data.date}</div>
              <div className="text-xs text-gray-500 mt-2 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">{data.timezone}</div>
          </div>
      </div>
    );
};
