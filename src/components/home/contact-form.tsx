"use client";

import { useState } from "react";
import { submitContactAction } from "@/actions/contact";
import { Button } from "@/components/ui/button";

interface ContactFormProps {
  listingId?: string;
}

export function ContactForm({ listingId }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    if (listingId) {
      formData.set("listingId", listingId);
    }

    try {
      await submitContactAction(formData);
      setSubmitted(true);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <h3 className="text-lg font-semibold text-green-400">Message Sent!</h3>
        <p className="mt-2 text-white/60">
          Thank you for reaching out. I&apos;ll get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-white/80"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-white/80"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>
      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-medium text-white/80"
        >
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="w-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="mb-1 block text-sm font-medium text-white/80"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          className="w-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
