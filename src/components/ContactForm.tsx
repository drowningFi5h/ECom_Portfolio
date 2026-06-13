'use client';

import { useState, FormEvent } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setStatus('success');
      form.reset();
    } else {
      setStatus('error');
    }
  }

  return (
    <section className="contact section-shell" id="contact">
      <div>
        <p className="eyebrow">Contact</p>
        <h2>Tell us what you need help with.</h2>
        <p>
          Email: <a href="mailto:contact@rahulbusinessservices.in">contact@rahulbusinessservices.in</a><br />
          Phone: <a href="tel:+917004478860">+91-7004478860</a> / <a href="tel:+919263699286">+91-9263699286</a>
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" type="text" placeholder="Your name" required />
        </label>
        <label>
          Work email
          <input name="email" type="email" placeholder="you@company.com" required />
        </label>
        <label>
          Service interest
          <select name="service" required>
            <option value="">Select a service</option>
            <option>eCommerce marketplace operations</option>
            <option>Marketplaces management</option>
            <option>Digital engineering</option>
            <option>Media &amp; design</option>
            <option>Digital marketing</option>
            <option>Social commerce</option>
            <option>Amazon account management</option>
          </select>
        </label>
        <label>
          Project details
          <textarea name="message" rows={5} placeholder="Share your marketplace goals or current challenges" required />
        </label>
        <button className="button button-primary" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send Message'}
        </button>
        {status === 'success' && <p style={{ color: 'green', margin: 0 }}>Message sent! We&apos;ll be in touch shortly.</p>}
        {status === 'error' && <p style={{ color: 'red', margin: 0 }}>Something went wrong. Please try again.</p>}
      </form>
    </section>
  );
}
