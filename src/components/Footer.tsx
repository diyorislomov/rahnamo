"use client";

import Link from "next/link";
import { useNetworkCopy } from "@/components/network/NetworkProvider";

export default function Footer() {
  const t = useNetworkCopy();

  return (
    <footer className="network-footer">
      <div className="network-footer-inner">
        <Link className="network-footer-brand" href="/" aria-label="Rahnamo">
          rahnamo<span>.</span>
        </Link>
        <nav className="network-footer-links" aria-label={t.footerLinks}>
          <Link href="/mentors">{t.mentors}</Link>
          <Link href="/become-counselor">{t.becomeMentor}</Link>
          <Link href="/privacy">{t.privacy}</Link>
        </nav>
        <span className="network-footer-copyright">
          © {new Date().getFullYear()} Rahnamo
        </span>
      </div>
    </footer>
  );
}
