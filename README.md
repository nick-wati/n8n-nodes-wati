# n8n-nodes-wati

This is an [n8n](https://n8n.io/) community node for [WATI](https://www.wati.io/) (WhatsApp Team Inbox). It lets you automate WhatsApp messaging workflows using the WATI V3 API.

[WATI](https://www.wati.io/) is a WhatsApp Business API solution that enables businesses to communicate with customers at scale through WhatsApp.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. Go to **Settings → Community Nodes** in your n8n instance.
2. Click **Install a community node**.
3. Enter `n8n-nodes-wati` and click **Install**.

## Credentials

You need a WATI account to use this node. To set up credentials:

1. Log in to your [WATI Dashboard](https://app.wati.io/).
2. Go to **API Docs** to find your **API Endpoint URL** and **Access Token**.
3. In n8n, create a new **WATI API** credential and enter these values.

## Supported Operations

### WATI Node

#### Message
- **Send Text Message** — Send a text message to an active WhatsApp conversation (within 24h window)
- **Send Interactive Buttons** — Send an interactive button message
- **Send Interactive List** — Send an interactive list message
- **Get Messages** — Retrieve messages for a conversation by conversation ID

#### Template Message
- **Send Template Message** — Send a template message (works outside the 24h window)
- **Get Templates** — Get a list of available message templates

#### Contact
- **Get Contacts** — Get a list of contacts
- **Get Contact Detail** — Get details of a specific contact by phone number
- **Add Contact** — Add a new contact

### WATI Trigger

- **Webhook Trigger** — Receive incoming messages and status updates via webhook

## API Version

This node exclusively supports the **WATI V3 API** (latest).

## Resources

- [WATI API Documentation](https://docs.wati.io/reference/introduction)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)

