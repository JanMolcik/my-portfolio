'use client';

import Script from 'next/script';
import { type FormEvent, useEffect, useRef, useState } from 'react';

type TurnstileInstance = {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string;
			theme: 'dark' | 'light' | 'auto';
			callback: (token: string) => void;
			'error-callback': () => void;
			'expired-callback': () => void;
		},
	) => string;
	reset: (widgetId?: string) => void;
	remove?: (widgetId?: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileInstance;
	}
}

type ContactFormProps = {
	siteKey: string | null;
	fallbackUrl: string | null;
};

export default function ContactForm({
	siteKey,
	fallbackUrl,
}: ContactFormProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const turnstileRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);
	const renderedAtRef = useRef(0);
	const [token, setToken] = useState('');
	const [scriptReady, setScriptReady] = useState(false);
	const [status, setStatus] = useState<
		'idle' | 'submitting' | 'success' | 'error'
	>('idle');
	const [feedback, setFeedback] = useState('');

	useEffect(() => {
		renderedAtRef.current = Date.now();
	}, []);

	useEffect(() => {
		if (
			!siteKey ||
			!scriptReady ||
			!turnstileRef.current ||
			!window.turnstile ||
			widgetIdRef.current
		) {
			return;
		}

		widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
			sitekey: siteKey,
			theme: 'dark',
			callback: (nextToken) => {
				setToken(nextToken);
				setFeedback('');
				setStatus((currentStatus) =>
					currentStatus === 'error' ? 'idle' : currentStatus,
				);
			},
			'error-callback': () => {
				setToken('');
				setStatus('error');
				setFeedback(
					'Human verification failed. Reload the challenge and try again.',
				);
			},
			'expired-callback': () => {
				setToken('');
				setStatus('idle');
				setFeedback(
					'Verification expired. Complete the challenge again before sending.',
				);
			},
		});

		return () => {
			if (widgetIdRef.current && window.turnstile?.remove) {
				window.turnstile.remove(widgetIdRef.current);
				widgetIdRef.current = null;
			}
		};
	}, [scriptReady, siteKey]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!formRef.current) {
			return;
		}

		setStatus('submitting');
		setFeedback('');

		const formData = new FormData(formRef.current);
		formData.set('renderedAt', String(renderedAtRef.current));
		formData.set('cf-turnstile-response', token);

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				body: formData,
				headers: {
					accept: 'application/json',
				},
			});
			const payload = (await response
				.json()
				.catch(() => ({ error: 'Unexpected response.' }))) as {
				message?: string;
				error?: string;
			};

			if (!response.ok && response.status !== 202) {
				setStatus('error');
				setFeedback(
					payload.error ??
						'Message could not be sent right now. Try again later.',
				);
				if (widgetIdRef.current && window.turnstile) {
					window.turnstile.reset(widgetIdRef.current);
				}
				setToken('');
				return;
			}

			formRef.current.reset();
			renderedAtRef.current = Date.now();
			setToken('');
			setStatus('success');
			setFeedback(
				payload.message ?? 'Message sent. I usually reply within 48 hours.',
			);
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.reset(widgetIdRef.current);
			}
		} catch {
			setStatus('error');
			setFeedback(
				'Network error. Use the direct contact links if the form keeps failing.',
			);
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.reset(widgetIdRef.current);
			}
			setToken('');
		}
	}

	if (!siteKey) {
		return (
			<div data-contact-form-unavailable>
				<p>Secure form is temporarily unavailable.</p>
				{fallbackUrl ? (
					<p>
						Use the direct contact link instead:{' '}
						<a href={fallbackUrl}>{fallbackUrl}</a>
					</p>
				) : null}
			</div>
		);
	}

	return (
		<>
			<Script
				src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
				strategy="afterInteractive"
				onLoad={() => {
					setScriptReady(true);
				}}
			/>
			<form data-contact-form onSubmit={handleSubmit} ref={formRef}>
				<div data-contact-field>
					<label htmlFor="contact-name">name</label>
					<input
						autoComplete="name"
						id="contact-name"
						maxLength={80}
						name="name"
						placeholder="Jan Molcik"
						required
						type="text"
					/>
				</div>
				<div data-contact-field>
					<label htmlFor="contact-email">email</label>
					<input
						autoComplete="email"
						id="contact-email"
						maxLength={320}
						name="email"
						placeholder="name@company.com"
						required
						type="email"
					/>
				</div>
				<div data-contact-field>
					<label htmlFor="contact-company">company</label>
					<input
						autoComplete="organization"
						id="contact-company"
						maxLength={80}
						name="company"
						placeholder="Optional"
						type="text"
					/>
				</div>
				<div data-contact-field>
					<label htmlFor="contact-message">message</label>
					<textarea
						id="contact-message"
						maxLength={2000}
						name="message"
						placeholder="Brief scope, timeline, and what kind of frontend problem you need solved."
						required
						rows={6}
					/>
				</div>
				<div aria-hidden="true" data-contact-honeypot>
					<label htmlFor="contact-website">website</label>
					<input
						autoComplete="off"
						id="contact-website"
						name="website"
						tabIndex={-1}
						type="text"
					/>
				</div>
				<input name="cf-turnstile-response" type="hidden" value={token} />
				<div data-contact-turnstile ref={turnstileRef} />
				<button
					disabled={
						status === 'submitting' || !scriptReady || token.length === 0
					}
					type="submit"
				>
					{status === 'submitting' ? 'sending...' : 'send secure message'}
				</button>
				<p data-contact-status={status} role="status">
					{feedback ||
						'Protected by Turnstile, server-side verification, honeypot filtering, and rate limiting.'}
				</p>
			</form>
		</>
	);
}
