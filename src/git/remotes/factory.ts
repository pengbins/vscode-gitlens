'use strict';
import { CustomRemoteType, RemotesConfig } from '../../configuration';
import { Logger } from '../../logger';
import { AzureDevOpsRemote } from './azure-devops';
import { BitbucketRemote } from './bitbucket';
import { BitbucketServerRemote } from './bitbucket-server';
import { CustomRemote } from './custom';
import { GitHubRemote } from './github';
import { GitLabRemote } from './gitlab';
import { RemoteProvider } from './provider';

export { RemoteProvider };
export type RemoteProviders = [string | RegExp, RemotesConfig | null, (domain: string, path: string) => RemoteProvider][];

const defaultProviders: RemoteProviders = [
	['bitbucket.org', null, (domain: string, path: string) => new BitbucketRemote(domain, path)],
	['github.com', null, (domain: string, path: string) => new GitHubRemote(domain, path)],
	['gitlab.com', null, (domain: string, path: string) => new GitLabRemote(domain, path)],
	[/\bdev\.azure\.com$/i, null, (domain: string, path: string) => new AzureDevOpsRemote(domain, path)],
	[/\bbitbucket\b/i, null, (domain: string, path: string) => new BitbucketServerRemote(domain, path)],
	[/\bgitlab\b/i, null, (domain: string, path: string) => new GitLabRemote(domain, path)],
	[
		/\bvisualstudio\.com$/i, null,
		(domain: string, path: string) => new AzureDevOpsRemote(domain, path, undefined, undefined, true)
	]
];

export class RemoteProviderFactory {
	static factory(providers: RemoteProviders): (domain: string, path: string) => RemoteProvider | undefined {
		return (domain: string, path: string) => this.create(providers, domain, path);
	}

	static create(providers: RemoteProviders, domain: string, path: string): RemoteProvider | undefined {
		try {
			const key = domain.toLowerCase();
			for (const [matcher, rc, creator] of providers) {
				if (
					(typeof matcher === 'string' && matcher === key) ||
					(typeof matcher !== 'string' && matcher.test(key))
				) {
					const remoteDomain = rc ? rc.domain : domain;
					return creator(remoteDomain, path);
				}
			}

			return undefined;
		} catch (ex) {
			Logger.error(ex, 'RemoteProviderFactory');
			return undefined;
		}
	}

	static loadProviders(cfg: RemotesConfig[] | null | undefined): RemoteProviders {
		const providers: RemoteProviders = [];

		if (cfg != null && cfg.length > 0) {
			for (const rc of cfg) {
				const provider = this.getCustomProvider(rc);
				if (provider === undefined) continue;
				const matcher = rc.matcher ? new RegExp(rc.matcher) : rc.domain.toLowerCase();
				providers.push([matcher, rc, provider]);
			}
		}

		providers.push(...defaultProviders);
		return providers;
	}

	private static getCustomProvider(cfg: RemotesConfig) {
		switch (cfg.type) {
			case CustomRemoteType.Bitbucket:
				return (domain: string, path: string) =>
					new BitbucketRemote(domain, path, cfg.protocol, cfg.name, true);
			case CustomRemoteType.BitbucketServer:
				return (domain: string, path: string) =>
					new BitbucketServerRemote(domain, path, cfg.protocol, cfg.name, true);
			case CustomRemoteType.Custom:
				return (domain: string, path: string) =>
					new CustomRemote(domain, path, cfg.urls!, cfg.protocol, cfg.name);
			case CustomRemoteType.GitHub:
				return (domain: string, path: string) => new GitHubRemote(domain, path, cfg.protocol, cfg.name, true);
			case CustomRemoteType.GitLab:
				return (domain: string, path: string) => new GitLabRemote(domain, path, cfg.protocol, cfg.name, true);
		}
		return undefined;
	}
}
