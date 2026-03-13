import { describe, expect, it } from 'vitest';
import {
	getProjectCardLinks,
	getProjectExternalLinks,
} from '@/lib/projects/project-links';

describe('UNIT-PROJECT-LINKS-001', () => {
	it('returns live and source links when both public urls exist', () => {
		expect(
			getProjectCardLinks({
				slug: 'shopsys-platform-core',
				projectUrl: 'https://www.shopsys.cz/',
				repositoryUrl: 'https://github.com/shopsys/shopsys',
			}),
		).toEqual([
			{ href: 'https://www.shopsys.cz/', label: 'live', external: true },
			{
				href: 'https://github.com/shopsys/shopsys',
				label: 'source',
				external: true,
			},
		]);
	});

	it('falls back to source and details when no live demo exists', () => {
		expect(
			getProjectCardLinks({
				slug: 'poohead-card-game',
				projectUrl: '',
				repositoryUrl: 'https://gitlab.com/JanMolcik/dullhead',
			}),
		).toEqual([
			{
				href: 'https://gitlab.com/JanMolcik/dullhead',
				label: 'source',
				external: true,
			},
			{
				href: '/projects/poohead-card-game',
				label: 'details',
				external: false,
			},
		]);
	});

	it('returns details only when both live and source are unavailable', () => {
		expect(
			getProjectCardLinks({
				slug: 'bitcoin-wallet',
				projectUrl: '',
				repositoryUrl: '',
			}),
		).toEqual([
			{
				href: '/projects/bitcoin-wallet',
				label: 'details',
				external: false,
			},
		]);
		expect(
			getProjectExternalLinks({
				slug: 'bitcoin-wallet',
				projectUrl: '',
				repositoryUrl: '',
			}),
		).toEqual([]);
	});
});
