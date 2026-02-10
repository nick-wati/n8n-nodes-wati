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
		displayName: 'WATI Trigger',
		name: 'watiTrigger',
		icon: 'file:wati.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description:
			'Trigger workflow on WATI webhook events (incoming messages, status updates). Configure the webhook URL in WATI Dashboard → Webhooks.',
		defaults: {
			name: 'WATI Trigger',
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
						description: 'Trigger on any WATI webhook event',
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
				// WATI webhooks are configured in WATI Dashboard → Settings → Webhooks.
				// The user must manually set the n8n webhook URL in WATI dashboard.
				// This node just provides the endpoint that WATI will POST to.
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				// Webhook creation is done manually in WATI Dashboard
				// or via the WATI API (POST /api/v3/webhooks/create).
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				// Webhook deletion is done manually in WATI Dashboard
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const event = this.getNodeParameter('event') as string;

		// Map WATI webhook event type keys to our filter values.
		// WATI sends different event type strings depending on the webhook type.
		const eventTypeMap: Record<string, string> = {
			whatsappMessageReceived: 'messageReceived',
			newContactMessage: 'newContactMessage',
			sessionMessageSent: 'sessionMessageSent',
			templateMessageSent: 'templateMessageSent',
			messageDelivered: 'messageDelivered',
			messageRead: 'messageRead',
			messageReplied: 'messageReplied',
			templateMessageFailed: 'templateMessageFailed',
		};

		// If filtering by event type (not "all"), check the incoming event
		if (event !== 'all') {
			const bodyData = body as IDataObject;
			const eventType =
				(bodyData.eventType as string) ||
				(bodyData.event as string) ||
				(bodyData.type as string) ||
				'';

			const mappedEvent = eventTypeMap[eventType] || eventType;

			if (mappedEvent !== event) {
				// Event doesn't match filter — return empty to skip
				return {
					workflowData: [[]],
				};
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body as IDataObject)],
		};
	}
}
