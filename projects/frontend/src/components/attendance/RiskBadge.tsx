import React from 'react';

interface RiskBadgeProps {
  score: number; // 0-1 range
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score }) => {
  const getRiskLevel = (score: number) => {
    if (score < 0.3) return { label: 'Low Risk', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score < 0.7) return { label: 'Medium Risk', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    return { label: 'High Risk', color: 'bg-red-50 text-red-700 border-red-200' };
  };

  const risk = getRiskLevel(score);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${risk.color}`}>
      {risk.label}
    </span>
  );
};
