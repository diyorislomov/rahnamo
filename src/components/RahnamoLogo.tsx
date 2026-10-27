'use client';

import React from 'react';
import Image from 'next/image';

interface RahnamoLogoProps {
  className?: string;
  variant?: 'full' | 'horizontal' | 'monogram';
  light?: boolean;
}

export function RahnamoRMark({
  className = "w-6 h-6",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 273 294"
      fill={light ? "#FFFFFF" : "#14171A"}
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 166 120 L 163 121 L 161 122 L 158 124 L 155 127 L 152 133 L 152 144 L 153 147 L 154 149 L 160 155 L 164 157 L 168 158 L 171 158 L 175 157 L 178 156 L 180 155 L 186 149 L 188 145 L 189 142 L 189 136 L 188 132 L 186 128 L 181 123 L 175 120 Z M 10 174 L 11 282 L 13 283 L 68 283 L 70 281 L 70 185 L 75 173 L 82 166 L 91 162 L 103 162 L 111 165 L 128 180 L 200 282 L 260 283 L 262 281 L 258 272 L 186 172 L 152 158 L 115 129 L 100 120 L 86 116 L 76 116 L 53 124 L 31 143 Z M 97 65 L 93 66 L 91 67 L 88 69 L 82 75 L 79 81 L 78 86 L 78 92 L 79 96 L 82 102 L 88 108 L 94 111 L 97 112 L 106 112 L 110 111 L 112 110 L 115 108 L 121 102 L 124 96 L 125 92 L 125 85 L 124 81 L 122 76 L 120 73 L 117 70 L 114 68 L 110 66 L 107 65 Z M 11 11 L 10 153 L 37 123 L 50 114 L 67 107 L 68 103 L 65 85 L 67 76 L 75 63 L 92 52 L 111 51 L 146 55 L 162 59 L 180 69 L 193 82 L 201 96 L 205 111 L 204 134 L 193 161 L 209 184 L 226 172 L 241 154 L 249 138 L 253 123 L 254 97 L 252 85 L 247 70 L 235 49 L 220 33 L 206 23 L 189 15 L 166 10 Z"
      />
    </svg>
  );
}

export function RahnamoMonogram({
  className = "h-9 w-9",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <RahnamoRMark className="w-full h-full" light={light} />
    </div>
  );
}

export default function RahnamoLogo({
  className = "h-11",
  variant = "horizontal",
  light = false,
}: RahnamoLogoProps) {
  if (variant === "monogram") {
    return <RahnamoMonogram className={className} light={light} />;
  }

  const src =
    variant === "full"
      ? light
        ? "/rahnamo-logo-full-white.png"
        : "/rahnamo-logo-full.png"
      : light
        ? "/rahnamo-logo-horizontal-white.png"
        : "/rahnamo-logo-horizontal.png";

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <Image
        src={src}
        alt="Rahnamo Mentorship Platform"
        width={variant === "full" ? 480 : 600}
        height={variant === "full" ? 480 : 180}
        className="h-full w-auto object-contain"
        priority
      />
    </div>
  );
}
