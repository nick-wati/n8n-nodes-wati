import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string };

export class WatiApi implements ICredentialType {
	name = 'watiApi';
	displayName = 'Wati API';
	documentationUrl = 'https://docs.wati.io/reference/introduction';
	properties: INodeProperties[] = [
		{
			displayName: 'API Endpoint URL',
			name: 'apiUrl',
			type: 'string',
			default: '',
			placeholder: 'https://live-mt-server.wati.io/123456',
			description:
				'The API endpoint URL from your Wati Dashboard → API Docs. Include the tenant ID (e.g. https://live-mt-server.wati.io/123456). The base URL will be derived automatically.',
			required: true,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Bearer token for Wati API authentication. Find it in Wati Dashboard → API Docs.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.accessToken}}',
				'User-Agent': `n8n-nodes-wati/${version}`,
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.apiUrl.replace(/\\/+$/, "").replace(/\\/\\d+$/, "")}}',
			url: '/api/ext/v3/contacts',
			method: 'GET',
			qs: {
				pageSize: 1,
			},
		},
	};
}
