import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
	IHttpRequestOptions,
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
					name: 'Send Button Message',
					value: 'sendInteractiveButtons',
					description:
						'Send a message with interactive buttons',
					action: 'Send a button message',
					},
					{
					name: 'Send List Message',
					value: 'sendInteractiveList',
					description:
						'Send a message with a selectable list',
					action: 'Send a list message',
					},
					{
						name: 'Get Messages',
						value: 'getMessages',
						description:
							'Get messages for a conversation by conversation ID',
						action: 'Get messages',
					},
					{
						name: 'Get Media',
						value: 'getMedia',
						description:
							'Download a media file (image, video, document, etc.) by message ID',
						action: 'Get a media file',
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
				displayName: 'Header Text',
				name: 'buttonHeaderText',
				type: 'string',
				default: '',
				placeholder: 'Welcome',
				description: 'Optional header text shown above the body',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveButtons'],
					},
				},
			},
			{
				displayName: 'Footer Text',
				name: 'buttonFooterText',
				type: 'string',
				default: '',
				placeholder: 'Powered by Wati',
				description: 'Optional footer text shown below the buttons',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveButtons'],
					},
				},
			},
			{
				displayName: 'Buttons',
				name: 'buttons',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				default: {},
				placeholder: 'Add Button',
				description: 'Up to 3 buttons for the user to tap',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveButtons'],
					},
				},
				options: [
					{
						displayName: 'Button',
						name: 'buttonValues',
						values: [
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								default: '',
								placeholder: 'Yes',
								description: 'Button label text',
							},
						],
					},
				],
			},

			// --- Send Interactive List ---
			{
				displayName: 'Body Text',
				name: 'listBodyText',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				placeholder: 'Please select an option:',
				description: 'The body text of the list message',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveList'],
					},
				},
			},
			{
				displayName: 'Button Text',
				name: 'listButtonText',
				type: 'string',
				required: true,
				default: 'Select',
				placeholder: 'Select',
				description:
					'The label on the button that opens the list',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveList'],
					},
				},
			},
			{
				displayName: 'Header Text',
				name: 'listHeaderText',
				type: 'string',
				default: '',
				placeholder: 'Menu',
				description: 'Optional header text shown above the body',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveList'],
					},
				},
			},
			{
				displayName: 'Footer Text',
				name: 'listFooterText',
				type: 'string',
				default: '',
				placeholder: 'Powered by Wati',
				description: 'Optional footer text shown below the list',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveList'],
					},
				},
			},
			{
				displayName: 'Sections',
				name: 'listSections',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				default: {},
				placeholder: 'Add Section',
				description: 'Sections of the list (max 10)',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendInteractiveList'],
					},
				},
				options: [
					{
						displayName: 'Section',
						name: 'sectionValues',
						values: [
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								placeholder: 'Section 1',
								description: 'Section heading',
							},
							{
								displayName: 'Rows',
								name: 'rows',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								placeholder: 'Add Row',
								description:
									'Selectable rows within this section (max 10)',
								options: [
									{
										displayName: 'Row',
										name: 'rowValues',
										values: [
											{
												displayName: 'ID',
												name: 'id',
												type: 'string',
												default: '',
												placeholder: '1',
												description:
													'Unique identifier returned when user selects this row',
											},
											{
												displayName: 'Title',
												name: 'title',
												type: 'string',
												default: '',
												placeholder: 'Option 1',
												description:
													'Row title (max 24 characters)',
											},
											{
												displayName: 'Description',
												name: 'description',
												type: 'string',
												default: '',
												placeholder: 'Description of option 1',
												description:
													'Optional row description (max 72 characters)',
											},
										],
									},
								],
							},
						],
					},
				],
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

			// --- Get Media ---
			{
				displayName: 'File URL',
				name: 'mediaFileUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://live-mt-server.wati.io/.../showFile?fileName=...',
				description:
					'The file URL from the incoming message\'s "data" field. Use {{ $json.data }} from a Wati Trigger output.',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getMedia'],
					},
				},
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description:
					'Name of the binary property to write the downloaded file to',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getMedia'],
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
				displayName: 'WhatsApp Number',
				name: 'whatsappNumber',
				type: 'string',
				required: true,
				default: '',
				placeholder: '919920842422',
				description:
					'Recipient phone number with country code (no + or spaces)',
				displayOptions: {
					show: {
						resource: ['templateMessage'],
						operation: ['sendTemplateMessage'],
					},
				},
			},
			{
				displayName: 'Template Parameters',
				name: 'customParams',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Parameter',
				description:
					'Custom parameter values to fill template variables',
				displayOptions: {
					show: {
						resource: ['templateMessage'],
						operation: ['sendTemplateMessage'],
					},
				},
				options: [
					{
						displayName: 'Parameter',
						name: 'parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'name',
								description:
									'Parameter name as defined in the template',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'John',
								description: 'Value for this parameter',
							},
						],
					},
				],
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
				displayName: 'Custom Parameters',
				name: 'contactCustomParams',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Parameter',
				description:
					'Optional custom attribute values for the contact',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['addContact'],
					},
				},
				options: [
					{
						displayName: 'Parameter',
						name: 'parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'company',
								description: 'Attribute name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'Acme',
								description: 'Attribute value',
							},
						],
					},
				],
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

						const options: IHttpRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/conversations/messages/text`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								target,
								text: messageText,
							},
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
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
					const bodyText = this.getNodeParameter(
						'bodyText',
						i,
					) as string;
					const headerText = this.getNodeParameter(
						'buttonHeaderText',
						i,
						'',
					) as string;
					const footerText = this.getNodeParameter(
						'buttonFooterText',
						i,
						'',
					) as string;
					const buttonsRaw = this.getNodeParameter(
						'buttons',
						i,
						{},
					) as IDataObject;

					const buttons =
						((buttonsRaw.buttonValues as IDataObject[]) ?? []).map(
							(b) => ({ text: b.text as string }),
						);

					const buttonMessage: IDataObject = {
						body: bodyText,
						buttons,
					};

					if (headerText) {
						buttonMessage.header = {
							type: 'Text',
							text: headerText,
						};
					}
					if (footerText) {
						buttonMessage.footer = footerText;
					}

					const options: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `${baseUrl}/api/ext/v3/conversations/messages/interactive`,
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							target,
							type: 'buttons',
							button_message: buttonMessage,
						},
					};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
				} else if (operation === 'sendInteractiveList') {
					const target = this.getNodeParameter(
						'target',
						i,
					) as string;
					const listBodyText = this.getNodeParameter(
						'listBodyText',
						i,
					) as string;
					const listButtonText = this.getNodeParameter(
						'listButtonText',
						i,
					) as string;
					const listHeaderText = this.getNodeParameter(
						'listHeaderText',
						i,
						'',
					) as string;
					const listFooterText = this.getNodeParameter(
						'listFooterText',
						i,
						'',
					) as string;
					const sectionsRaw = this.getNodeParameter(
						'listSections',
						i,
						{},
					) as IDataObject;

					const sections =
						((sectionsRaw.sectionValues as IDataObject[]) ?? []).map(
							(section) => {
								const rowsRaw = (section.rows as IDataObject) ?? {};
								const rows =
									((rowsRaw.rowValues as IDataObject[]) ?? []).map(
										(row) => ({
											id: row.id as string,
											title: row.title as string,
											...(row.description
												? { description: row.description as string }
												: {}),
										}),
									);
								return {
									title: section.title as string,
									rows,
								};
							},
						);

					const listMessage: IDataObject = {
						body: listBodyText,
						button_text: listButtonText,
						sections,
					};

					if (listHeaderText) {
						listMessage.header = listHeaderText;
					}
					if (listFooterText) {
						listMessage.footer = listFooterText;
					}

					const options: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `${baseUrl}/api/ext/v3/conversations/messages/interactive`,
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							target,
							type: 'list',
							list_message: listMessage,
						},
					};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
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

						const options: IHttpRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/conversations/${encodeURIComponent(conversationId)}/messages`,
							qs: {
								pageSize,
								pageNumber,
							},
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'getMedia') {
						const fileUrl = this.getNodeParameter(
							'mediaFileUrl',
							i,
						) as string;
						const binaryPropertyName = this.getNodeParameter(
							'binaryPropertyName',
							i,
							'data',
						) as string;

						let downloadUrl: string;
						if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
							downloadUrl = fileUrl;
						} else {
							downloadUrl = `${baseUrl}/api/ext/v3/conversations/messages/file/${encodeURIComponent(fileUrl)}`;
						}

						const options: IHttpRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							url: downloadUrl,
							encoding: 'arraybuffer',
							returnFullResponse: true,
						};

						const response =
							await this.helpers.httpRequestWithAuthentication.call(
								this,
								'watiApi',
								options,
							);

						const fullResponse = response as unknown as {
							body: Buffer;
							headers: Record<string, string>;
						};

						const contentType =
							fullResponse.headers['content-type'] || 'application/octet-stream';
						const contentDisposition =
							fullResponse.headers['content-disposition'] || '';

						const urlPath = downloadUrl.split('/').pop()?.split('?')[0] || 'file';
						let fileName = urlPath;
						const fileNameMatch = contentDisposition.match(
							/filename[^;=\n]*=(?:['"]?)([^'"\n;]+)/i,
						);
						if (fileNameMatch?.[1]) {
							fileName = fileNameMatch[1];
						} else if (!fileName.includes('.')) {
							const ext = contentType.split('/')[1]?.split(';')[0] || 'bin';
							fileName = `${fileName}.${ext}`;
						}

						const binaryData =
							await this.helpers.prepareBinaryData(
								Buffer.from(fullResponse.body),
								fileName,
								contentType,
							);

						returnData.push({
							json: { fileUrl, fileName, mimeType: contentType },
							binary: { [binaryPropertyName]: binaryData },
							pairedItem: { item: i },
						});
						continue;
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
						const whatsappNumber = this.getNodeParameter(
							'whatsappNumber',
							i,
						) as string;
						const customParamsRaw = this.getNodeParameter(
							'customParams',
							i,
							{},
						) as IDataObject;

						const customParams =
							((customParamsRaw.parameter as IDataObject[]) ?? []).map(
								(p) => ({
									name: p.name as string,
									value: p.value as string,
								}),
							);

						const receiver: IDataObject = {
							whatsappNumber,
							...(customParams.length > 0 && { customParams }),
						};

						const options: IHttpRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/messageTemplates/send`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								template_name: templateName,
								broadcast_name: broadcastName,
								receivers: [receiver],
							},
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
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

						const options: IHttpRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/messageTemplates`,
							qs: {
								pageSize,
							},
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
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

						const options: IHttpRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/contacts`,
							qs: {
								pageSize,
								pageNumber,
							},
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
								this,
								'watiApi',
								options,
							)) as IDataObject;
					} else if (operation === 'getContactDetail') {
						const phoneNumber = this.getNodeParameter(
							'phoneNumber',
							i,
						) as string;

						const options: IHttpRequestOptions = {
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/contacts/${encodeURIComponent(phoneNumber)}`,
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
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
					const contactCustomParamsRaw = this.getNodeParameter(
						'contactCustomParams',
						i,
						{},
					) as IDataObject;

					const customParams =
						((contactCustomParamsRaw.parameter as IDataObject[]) ?? []).map(
							(p) => ({
								name: p.name as string,
								value: p.value as string,
							}),
						);

					const body: IDataObject = {
						whatsapp_number: whatsappNumber,
						name: contactName,
					};

					if (customParams.length > 0) {
						body.custom_params = customParams;
					}

						const options: IHttpRequestOptions = {
							method: 'POST' as IHttpRequestMethods,
							url: `${baseUrl}/api/ext/v3/contacts`,
							headers: {
								'Content-Type': 'application/json',
							},
							body,
						};

						responseData =
							(await this.helpers.httpRequestWithAuthentication.call(
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
								pairedItem: { item: i },
							})),
						);
					} else {
						returnData.push({
							json: responseData as IDataObject,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
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
