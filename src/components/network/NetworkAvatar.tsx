"use client";
import { useState } from "react";
export function Avatar({
  person,
  size = 44,
}: {
  person: { name: string; image?: string | null };
  size?: number;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <span
      className="network-avatar"
      style={{ width: size, height: size, fontSize: Math.max(14, size / 3) }}
    >
      {person.image && failedImage !== person.image ? (
        <img
          src={person.image}
          alt=""
          width={size}
          height={size}
          onError={() => setFailedImage(person.image || null)}
          loading="lazy"
        />
      ) : (
        person.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      )}
    </span>
  );
}
