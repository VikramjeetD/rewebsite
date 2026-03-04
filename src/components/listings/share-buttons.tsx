"use client";

import { useState } from "react";
import { Link2, MessageCircle, Mail, MessageSquare, Check } from "lucide-react";
import { absoluteUrl } from "@/lib/utils";

interface ShareButtonsProps {
  slug: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  neighborhood: string;
  price: string;
}

export function ShareButtons({
  slug,
  address,
  bedrooms,
  bathrooms,
  neighborhood,
  price,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const url = absoluteUrl(`/listings/${slug}`);
  const beds = bedrooms === 0 ? "Studio" : `${bedrooms} bed`;
  const baths = `${bathrooms} bath`;
  const text = `Check out this listing: ${address} – ${beds}, ${baths} in ${neighborhood}. ${price}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  const buttons = [
    {
      label: "Copy Link",
      icon: copied ? Check : Link2,
      onClick: handleCopy,
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(address)}&body=${encodeURIComponent(text + "\n" + url)}`,
    },
    {
      label: "SMS",
      icon: MessageSquare,
      href: `sms:?body=${encodeURIComponent(text + "\n" + url)}`,
    },
  ];

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-white/40">
        Share
      </p>
      <div className="flex gap-2">
        {buttons.map((btn) => {
          const Icon = btn.icon;
          if (btn.onClick) {
            return (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                title={btn.label}
                className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          }
          return (
            <a
              key={btn.label}
              href={btn.href}
              target="_blank"
              rel="noopener noreferrer"
              title={btn.label}
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
