# n8n-nodes-wati

This is an [n8n](https://n8n.io/) community node for [Wati](https://www.wati.io/) (WhatsApp Team Inbox). It lets you automate WhatsApp messaging workflows using the Wati API.

[Wati](https://www.wati.io/) is a WhatsApp Business API solution that enables businesses to communicate with customers at scale through WhatsApp.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. Go to **Settings → Community Nodes** in your n8n instance.
2. Click **Install a community node**.
3. Enter `n8n-nodes-wati` and click **Install**.

## Credentials

You need a Wati account to use this node. To set up credentials:

1. Log in to your [Wati Dashboard](https://app.wati.io/).
2. Go to **API Docs** to find your **API Endpoint URL** and **Access Token**.
3. In n8n, create a new **Wati API** credential and enter these values.

## Supported Operations

### Wati Node

#### Message
- **Send Text Message** — Send a text message to an active WhatsApp conversation (within 24h window)
- **Send Button Message** — Send a message with interactive buttons
- **Send List Message** — Send a message with a selectable list
- **Get Messages** — Retrieve messages for a conversation by conversation ID
- **Get Media** — Download a media file (image, video, document, audio, etc.) by message ID

#### Template Message
- **Send Template Message** — Send a template message (works outside the 24h window)
- **Get Templates** — Get a list of available message templates

#### Contact
- **Get Contacts** — Get a list of contacts
- **Get Contact Detail** — Get details of a specific contact by phone number
- **Add Contact** — Add a new contact

### Wati Trigger

- **Webhook Trigger** — Receive incoming messages and status updates via webhook

## Resources

- [Sign up for Wati](https://auth.wati.io/register/?utm_source=n8n&utm_medium=referral&utm_campaign=n8n)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)

