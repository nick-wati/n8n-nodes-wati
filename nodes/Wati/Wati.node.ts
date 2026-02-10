import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

/**
 * Derive the API base URL from the Wati dashboard URL.
 * Dashboard URL format: https://live-mt-server.wati.io/123456
 * API base URL format:  https://live-mt-server.wati.io
 */
function getApiBaseUrl(apiUrl: string): string {
	const cleaned = apiUrl.replace(/\/+$/, '');
	// Strip trailing tenant ID (numeric path segment)
	return cleaned.replace(/\/\d+$/, '');
}

export class Wati implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wati',
		name: 'wati',
		icon: 'file:wati.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Send and receive WhatsApp messages via Wati API',
		defaults: {
			name: 'Wati',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'watiApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//         Resource
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Template Message',
						value: 'templateMessage',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'message',
			},

			// ----------------------------------
			//         Message Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Send Text Message',
						value: 'sendTextMessage',
						description:
							'Send a text message to an active WhatsApp conversation (within 24h window)',
						action: 'Send a text message',
					},
					{
						name: 'Send Interactive Buttons',
						value: 'sendInteractiveButtons',
						description:
							'Send an interactive button message',
						action: 'Send interactive buttons',
					},
					{
						name: 'Send Interactive List',
						value: 'sendInteractiveList',
						description:
							'Send an interactive list message',
						action: 'Send interactive list',
					},
					{
						name: 'Get Messages',
						value: 'getMessages',
						description:
							'Get messages for a conversation by conversation ID',
						action: 'Get messages',
					},
				],
				default: 'sendTextMessage',
			},

			// ----------------------------------
			//     Template Message Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['templateMessage'],
					},
				},
				options: [
					{
						name: 'Send Template Message',
						value: 'sendTemplateMessage',
						description:
							'Send a template message (outside 24h window)',
						action: 'Send a template message',
					},
					{
						name: 'Get Templates',
						value: 'getTemplates',
						description: 'Get list of message templates',
						action: 'Get templates',
					},
				],
				default: 'sendTemplateMessage',
			},

			// ----------------------------------
			//         Contact Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['contact'],
					},
				},
				options: [
					{
						name: 'Get Contacts',
						value: 'getContacts',
						description: 'Get list of contacts',
						action: 'Get contacts',
					},
					{
						name: 'Get Contact Detail',
						value: 'getContactDetail',
						description:
							'Get details of a specific contact by phone number',
						action: 'Get contact detail',
					},
					{
						name: 'Add Contact',
						value: 'addContact',
						description: 'Add a new contact',
						action: 'Add a contact',
					},
				],
				default: 'getContacts',
			},

			// ==================================
			//     Message Parameters
			// ==================================

			// --- Target (phone number or conversation ID) ---
			{
				displayName: 'Target (Phone Number)',
				name: 'target',
				type: 'string',
				required: true,
				default: '',
				placeholder: '14155552671',
				description:
					'The target conversation. Can be a phone number (e.g. 14155552671), conversation ID, or Channel:PhoneNumber format.',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: [
							'sendTextMessage',
							'sendInteractiveButtons',
							'sendInteractiveList',
						],
					},
				},
			},

			// --- Send Text Message ---
			{
				displayName: 'Message Text',
				name: 'messageText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				default: '',
				placeholder: 'Hello, this is a test message!',
				description: 'The text content of the message to send',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendTextMessage'],
					},
				},
			},

			// --- Send Interactive Buttons ---
			{
				displayName: 'Body Text',
				name: 'bodyText',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				placeholder: 'Please choose an option:',
				description: 'The body text of the interactive message',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveButtons'],
					},
				},
			},
		{
			displayName: 'Buttons (JSON)',
			name: 'buttonsJson',
			type: 'json',
			required: true,
			default:
				'{\n  "body": "Choose an option",\n  "buttons": [\n    { "text": "Yes" },\n    { "text": "No" }\n  ]\n}',
			description:
				'The button_message JSON object. "body" is a plain string, "buttons" is an array of {text} objects (max 3). Optional: "header" as {"type":"Text","text":"..."}, "footer" as a string.',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveButtons'],
					},
				},
			},

			// --- Send Interactive List ---
		{
			displayName: 'List Message (JSON)',
			name: 'listJson',
			type: 'json',
			required: true,
			default:
				'{\n  "body": "Please select:",\n  "button_text": "Select",\n  "sections": [\n    {\n      "title": "Section 1",\n      "rows": [\n        { "id": "1", "title": "Option 1", "description": "Desc 1" },\n        { "id": "2", "title": "Option 2", "description": "Desc 2" }\n      ]\n    }\n  ]\n}',
			description:
				'The list_message JSON object. "body" is a plain string, "button_text" is the button label, "sections" is the array of section objects. Optional: "header" and "footer" as strings.',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveList'],
					},
				},
			},

			// --- Get Messages ---
			{
				displayName: 'Conversation ID',
				name: 'conversationId',
				type: 'string',
				required: true,
				default: '',
				placeholder: '65b73810e2bd04...',
				description:
					'The conversation ID. You can find this in the response of a send message operation or from Wati dashboard.',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getMessages'],
					},
				},
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 20,
				description: 'Number of messages to retrieve per page',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getMessages'],
					},
				},
			},
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getMessages'],
					},
				},
			},

			// ==================================
			//   Template Message Parameters
			// ==================================
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'hello_world',
				description: 'The name of the WhatsApp message template',
				displayOptions: {
					show: {
						resource: ['templateMessage'],
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'Broadcast Name',
				name: 'broadcastName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'my_broadcast',
				description:
					'A name to identify this broadcast/campaign',
				displayOptions: {
					show: {
						resource: ['templateMessage'],
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'Recipients (JSON)',
				name: 'recipientsJson',
				type: 'json',
				required: true,
				default:
					'[\n  {\n    "whatsapp_number": "14155552671",\n    "custom_params": [\n      { "name": "name", "value": "John" }\n    ]\n  }\n]',
				description:
					'JSON array of recipients. Each must have whatsapp_number and optionally custom_params.',
				displayOptions: {
					show: {
						resource: ['templateMessage'],
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'Page Size',
				name: 'templatePageSize',
				type: 'number',
				default: 20,
				description: 'Number of templates to retrieve per page',
				displayOptions: {
					show: {
						resource: ['templateMessage'],
						operation: ['getTemplates'],
					},
				},
			},

			// ==================================
			//     Contact Parameters
			// ==================================
			{
				displayName: 'Page Size',
				name: 'contactPageSize',
				type: 'number',
				default: 20,
				description: 'Number of contacts to retrieve per page',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getContacts'],
					},
				},
			},
			{
				displayName: 'Page Number',
				name: 'contactPageNumber',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getContacts'],
					},
				},
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				required: true,
				default: '',
				placeholder: '14155552671',
				description:
					'Phone number of the contact (with country code, no + prefix)',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getContactDetail'],
					},
				},
			},
			{
				displayName: 'WhatsApp Number',
				name: 'whatsappNumber',
				type: 'string',
				required: true,
				default: '',
				placeholder: '14155552671',
				description:
					'Phone number (with country code, no + prefix)',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['addContact'],
					},
				},
			},
			{
				displayName: 'Name',
				name: 'contactName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'John Doe',
				description: 'Name of the new contact',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['addContact'],
					},
				},
			},
			{
				displayName: 'Custom Parameters (JSON)',
				name: 'customParamsJson',
				type: 'json',
				default: '[]',
				description:
					'Optional JSON array of custom parameters, e.g. [{"name":"company","value":"Acme"}]',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['addContact'],
					},
				},
			},
		],
	};

	async execute(
		this: IExecuteFunctions,
	): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('watiApi');

		const apiUrl = credentials.apiUrl as string;
		const baseUrl = getApiBaseUrl(apiUrl);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | undefined;

				// ========================
				//       Message
				// ========================
				if (resource === 'message') {
					if (operation === 'sendTextMessage') {
						const target = this.getNodeParameter(
							'target',
							i,
						) as string;
						const messageText = this.getNodeParameter(
							'messageText',
							i,
						) as string;

						const options: IRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/conversations/messages/text`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								target,
								text: messageText,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (
						operation === 'sendInteractiveButtons'
					) {
						const target = this.getNodeParameter(
							'target',
							i,
						) as string;
						const buttonsJsonRaw = this.getNodeParameter(
							'buttonsJson',
							i,
						) as string;

						let buttonMessage: unknown;
						try {
							buttonMessage =
								typeof buttonsJsonRaw === 'string'
									? JSON.parse(buttonsJsonRaw)
									: buttonsJsonRaw;
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Invalid JSON in Buttons field.',
								{ itemIndex: i },
							);
						}

						const options: IRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/conversations/messages/interactive`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								target,
								type: 'buttons',
								button_message: buttonMessage,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'sendInteractiveList') {
						const target = this.getNodeParameter(
							'target',
							i,
						) as string;
						const listJsonRaw = this.getNodeParameter(
							'listJson',
							i,
						) as string;

						let listMessage: unknown;
						try {
							listMessage =
								typeof listJsonRaw === 'string'
									? JSON.parse(listJsonRaw)
									: listJsonRaw;
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Invalid JSON in List Message field.',
								{ itemIndex: i },
							);
						}

						const options: IRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/conversations/messages/interactive`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								target,
								type: 'list',
								list_message: listMessage,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'getMessages') {
						const conversationId = this.getNodeParameter(
							'conversationId',
							i,
						) as string;
						const pageSize = this.getNodeParameter(
							'pageSize',
							i,
							20,
						) as number;
						const pageNumber = this.getNodeParameter(
							'pageNumber',
							i,
							1,
						) as number;

						const options: IRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/conversations/${encodeURIComponent(conversationId)}/messages`,
							qs: {
								pageSize,
								pageNumber,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					}
				}

				// ========================
				//    Template Message
				// ========================
				else if (resource === 'templateMessage') {
					if (operation === 'sendTemplateMessage') {
						const templateName = this.getNodeParameter(
							'templateName',
							i,
						) as string;
						const broadcastName = this.getNodeParameter(
							'broadcastName',
							i,
						) as string;
						const recipientsJsonRaw =
							this.getNodeParameter(
								'recipientsJson',
								i,
							) as string;

						let recipients: unknown[];
						try {
							recipients =
								typeof recipientsJsonRaw === 'string'
									? (JSON.parse(
											recipientsJsonRaw,
										) as unknown[])
									: (recipientsJsonRaw as unknown as unknown[]);
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Invalid JSON in Recipients field.',
								{ itemIndex: i },
							);
						}

						const options: IRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/messageTemplates/send`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								template_name: templateName,
								broadcast_name: broadcastName,
								recipients,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'getTemplates') {
						const pageSize = this.getNodeParameter(
							'templatePageSize',
							i,
							20,
						) as number;

						const options: IRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/messageTemplates`,
							qs: {
								pageSize,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					}
				}

				// ========================
				//       Contact
				// ========================
				else if (resource === 'contact') {
					if (operation === 'getContacts') {
						const pageSize = this.getNodeParameter(
							'contactPageSize',
							i,
							20,
						) as number;
						const pageNumber = this.getNodeParameter(
							'contactPageNumber',
							i,
							1,
						) as number;

						const options: IRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/contacts`,
							qs: {
								pageSize,
								pageNumber,
							},
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'getContactDetail') {
						const phoneNumber = this.getNodeParameter(
							'phoneNumber',
							i,
						) as string;

						const options: IRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/contacts/${encodeURIComponent(phoneNumber)}`,
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'addContact') {
						const whatsappNumber = this.getNodeParameter(
							'whatsappNumber',
							i,
						) as string;
						const contactName = this.getNodeParameter(
							'contactName',
							i,
						) as string;
						const customParamsJsonRaw =
							this.getNodeParameter(
								'customParamsJson',
								i,
								'[]',
							) as string;

						let customParams: unknown[];
						try {
							customParams =
								typeof customParamsJsonRaw === 'string'
									? (JSON.parse(
											customParamsJsonRaw,
										) as unknown[])
									: (customParamsJsonRaw as unknown as unknown[]);
						} catch {
							customParams = [];
						}

						const body: IDataObject = {
							whatsapp_number: whatsappNumber,
							name: contactName,
						};

						if (
							Array.isArray(customParams) &&
							customParams.length > 0
						) {
							body.custom_params = customParams;
						}

						const options: IRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							uri: `${baseUrl}/api/ext/v3/contacts`,
							headers: {
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						};

						responseData =
							(await this.helpers.requestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					}
				}

				// Push response data
				if (responseData !== undefined) {
					if (Array.isArray(responseData)) {
						returnData.push(
							...responseData.map((item) => ({
								json: item as IDataObject,
							})),
						);
					} else {
						returnData.push({
							json: responseData as IDataObject,
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
					});
					continue;
				}
				throw new NodeOperationError(
					this.getNode(),
					error as Error,
					{
						itemIndex: i,
					},
				);
			}
		}

		return [returnData];
	}
}
