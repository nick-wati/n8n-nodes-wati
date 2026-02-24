import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class WatiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wati Trigger',
		name: 'watiTrigger',
		icon: 'file:wati.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description:
			'Trigger workflow on Wati webhook events (incoming messages, status updates). Configure the webhook URL in Wati Dashboard → Webhooks.',
		defaults: {
			name: 'Wati Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'watiApi',
				required: false,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'All Events',
						value: 'all',
						description: 'Trigger on any Wati webhook event',
					},
					{
						name: 'Message Received',
						value: 'messageReceived',
						description:
							'When a new message is received from a contact',
					},
					{
						name: 'New Contact Message',
						value: 'newContactMessage',
						description: 'When a new contact sends a message',
					},
					{
						name: 'Session Message Sent',
						value: 'sessionMessageSent',
						description: 'When a session message is sent',
					},
					{
						name: 'Template Message Sent',
						value: 'templateMessageSent',
						description: 'When a template message is sent',
					},
					{
						name: 'Message Delivered',
						value: 'messageDelivered',
						description: 'When a sent message is delivered',
					},
					{
						name: 'Message Read',
						value: 'messageRead',
						description: 'When a sent message is read',
					},
					{
						name: 'Message Replied',
						value: 'messageReplied',
						description: 'When a sent message is replied to',
					},
					{
						name: 'Template Message Failed',
						value: 'templateMessageFailed',
						description: 'When a template message fails to send',
					},
				],
				default: 'all',
				description: 'Which event to listen for',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Wati webhooks are configured in Wati Dashboard → Settings → Webhooks.
				// The user must manually set the n8n webhook URL in Wati dashboard.
				// This node just provides the endpoint that Wati will POST to.
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				// Webhook creation is done manually in Wati Dashboard
				// or via the Wati API (POST /api/v3/webhooks/create).
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				// Webhook deletion is done manually in Wati Dashboard
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData();
		const query = this.getQueryData() as IDataObject;

		let body: IDataObject = {};

		// 1. Try n8n's built-in body parsing
		try {
			const parsed = this.getBodyData();
			if (parsed && typeof parsed === 'object' && !Buffer.isBuffer(parsed)) {
				body = parsed as IDataObject;
			}
		} catch {
			// getBodyData() can throw if body parsing failed upstream
		}

		// 2. If body is empty, explicitly read and parse rawBody
		if (Object.keys(body).length === 0) {
			try {
				const readRawBody = (req as unknown as { readRawBody?: () => Promise<void> })
					.readRawBody;
				if (typeof readRawBody === 'function') {
					await readRawBody();
				}
			} catch {
				// Stream may already be consumed
			}

			const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
			if (rawBody && rawBody.length > 0) {
				try {
					body = JSON.parse(rawBody.toString('utf-8')) as IDataObject;
				} catch {
					body = { rawData: rawBody.toString('utf-8') } as IDataObject;
				}
			}
		}

		// 3. If still empty, try req.body directly (may be Buffer or string)
		if (Object.keys(body).length === 0 && req.body) {
			if (Buffer.isBuffer(req.body)) {
				try {
					body = JSON.parse(req.body.toString('utf-8')) as IDataObject;
				} catch {
					body = { rawData: req.body.toString('utf-8') } as IDataObject;
				}
			} else if (typeof req.body === 'string' && req.body.length > 0) {
				try {
					body = JSON.parse(req.body) as IDataObject;
				} catch {
					body = { rawData: req.body } as IDataObject;
				}
			}
		}

		// 4. If body is still empty, include diagnostic info so the user can
		//    troubleshoot (e.g. wrong webhook URL, proxy stripping body, etc.)
		if (Object.keys(body).length === 0) {
			body = {
				_webhookReceived: true,
				_bodyEmpty: true,
				_contentType: (headers['content-type'] as string) || 'not set',
				_method: req.method,
				_query: query,
			};
		}

		const event = this.getNodeParameter('event') as string;

		const eventTypeMap: Record<string, string> = {
			message: 'messageReceived',
			whatsappMessageReceived: 'messageReceived',
			newContactMessage: 'newContactMessage',
			sessionMessageSent: 'sessionMessageSent',
			templateMessageSent: 'templateMessageSent',
			messageDelivered: 'messageDelivered',
			messageRead: 'messageRead',
			messageReplied: 'messageReplied',
			templateMessageFailed: 'templateMessageFailed',
		};

		if (event !== 'all') {
			const eventType =
				(body.eventType as string) ||
				(body.event as string) ||
				(body.type as string) ||
				'';

			const mappedEvent = eventTypeMap[eventType] || eventType;

			if (mappedEvent !== event) {
				return {
					workflowData: [[]],
				};
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
