const storyblokFrameAncestors = (
	process.env.STORYBLOK_FRAME_ANCESTORS || 'https://app.storyblok.com'
)
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const frameAncestorsDirective = ["'self'", ...storyblokFrameAncestors].join(
	' ',
);

const contentSecurityPolicyDirectives = [
	"default-src 'self'",
	"base-uri 'self'",
	"form-action 'self'",
	`frame-ancestors ${frameAncestorsDirective}`,
	"img-src 'self' data: https://a.storyblok.com https://images.ctfassets.net",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.storyblok.com https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' data: https://fonts.gstatic.com",
	"connect-src 'self' https://api.storyblok.com https://*.storyblok.com https://challenges.cloudflare.com",
	"frame-src 'self' https://challenges.cloudflare.com",
	'upgrade-insecure-requests',
];

const securityHeaders = [
	{
		key: 'Content-Security-Policy',
		value: contentSecurityPolicyDirectives.join('; '),
	},
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-DNS-Prefetch-Control', value: 'off' },
	{
		key: 'Strict-Transport-Security',
		value: 'max-age=63072000; includeSubDomains; preload',
	},
	{
		key: 'Permissions-Policy',
		value: 'camera=(), geolocation=(), microphone=()',
	},
];

/** @type {import('next').NextConfig} */
const nextConfig = {
	// The following environment variables can be safely exposed to the public bundle.
	// The Storyblok public access token is required for features like live preview.
	env: {
		STORYBLOK_DELIVERY_API_TOKEN: process.env.STORYBLOK_DELIVERY_API_TOKEN,
		STORYBLOK_API_BASE_URL: process.env.STORYBLOK_API_BASE_URL,
		STORYBLOK_REGION: process.env.STORYBLOK_REGION,
	},
	images: {
		remotePatterns: [
			{ hostname: 'a.storyblok.com' },
			{ hostname: 'images.ctfassets.net' },
		],
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 31536000,
	},
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: '/:path*',
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
