"use client";
import React from "react";

interface LineChartProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
}

export default function LineChart({ data, labels, width, height }: LineChartProps) {
  // Si no se especifican dimensiones, usar valores más grandes por defecto
  const chartWidth = width || 800;
  const chartHeight = height || 350;
  const maxValue = Math.max(...data, 1);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - (value / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={chartWidth} height={chartHeight} className="w-full h-full">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-primary"
      />
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * chartWidth;
        const y = chartHeight - (value / maxValue) * chartHeight;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="4"
            fill="currentColor"
            className="text-primary"
          />
        );
      })}
      {labels && (
        <g>
          {labels.map((label, index) => {
            const x = (index / (labels.length - 1)) * chartWidth;
            return (
              <text
                key={index}
                x={x}
                y={chartHeight + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {label}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
}