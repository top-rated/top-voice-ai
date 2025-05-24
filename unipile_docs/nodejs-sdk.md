Start a new chat
post
https://{subdomain}.unipile.com:{port}/api/v1/chats
Start a new conversation with one or more attendee. ⚠️ Interactive documentation does not work for Linkedin specific parameters (child parameters not correctly applied in snippet), the correct format is linkedin[inmail] = true, linkedin[api]...

Log in to see full request history
time	status	user agent	
Make a request to see history.
0 Requests This Month

Body Params
account_id
string
required
length ≥ 1
An Unipile account id.

text
string
The message that will start the new conversation.
With LinkedIn recruiter, a range of HTML tags can be used directly in the body of the message to enhance the presentation. The supported tags are <strong> for bold text, <em> for italic text, <a href="www.my-link.com"> for external links, <ul> for unordered lists, <ol> for ordered lists and <li> for list items. Tags can be nested into each other if necessary.

attachments
array of files

ADD file
voice_message
file
For Linkedin messaging only.

No file chosen
video_message
file
For Linkedin messaging only.

No file chosen
attendees_ids
array of strings
required
length ≥ 1
One or more attendee provider ID.


string


ADD string
subject
string
An optional field to set the subject of the conversation.

linkedin
Extra fields for Linkedin products


object

object

object
Responses

201
Created. New chat created and message sent successfully.

Response body
object
object
string
required
ChatStarted

chat_id
required
The Unipile ID of the newly started chat.


string

Option 2
message_id
required
The Unipile ID of the message the chat started with.


string

Option 2
const formData = new FormData();

const url = 'https://api1.unipile.com:13153/api/v1/chats';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'X-API-KEY': 'xg3SQMtu.Z1yl0+QHjVi2p7NdD3xVMfYY6c7qDPZPgMkha5Didb0='
  },
  body: formData
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));

  response

  {
  "object": "ChatStarted",
  "chat_id": "string",
  "message_id": "string"
}

----
Retrieve a chat
get
https://{subdomain}.unipile.com:{port}/api/v1/chats/{chat_id}
Retrieve the details of a chat.

Log in to see full request history
time	status	user agent	
Make a request to see history.
0 Requests This Month

Path Params
chat_id
string
required
The Unipile or provider ID of the chat.

Query Params
account_id
string
Mandatory if the chat ID is a provider ID.

Responses

200
OK. Request succeeded.

Response body
object
id
string
required
length ≥ 1
A unique identifier.

account_id
string
required
length ≥ 1
A unique identifier.

account_type
required
provider_id
string
required
attendee_provider_id
string
name
required

string

Option 2
type
required
timestamp
required

string

import { UnipileClient } from "unipile-node-sdk"

// SDK setup
const BASE_URL = "your base url"
const ACCESS_TOKEN = "your access token"
// Inputs
const chat_id = "chat id"

try {
	const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)

	const response = await client.messaging.getChat(chat_id)
} catch (error) {
	console.log(error)
}
response
{
  "id": "string",
  "account_id": "string",
  "account_type": "WHATSAPP",
  "provider_id": "string",
  "attendee_provider_id": "string",
  "name": "string",
  "type": 0,
  "timestamp": "string",
  "unread_count": 0,
  "archived": 0,
  "muted_until": -1,
  "read_only": 0,
  "disabledFeatures": [
    "reactions",
    "reply"
  ],
  "subject": "string",
  "organization_id": "string",
  "mailbox_id": "string",
  "content_type": "inmail",
  "folder": [
    "INBOX",
    "INBOX_LINKEDIN_CLASSIC",
    "INBOX_LINKEDIN_RECRUITER",
    "INBOX_LINKEDIN_SALES_NAVIGATOR",
    "INBOX_LINKEDIN_ORGANIZATION"
  ],
  "object": "Chat",
  "lastMessage": {
    "provider_id": "string",
    "sender_id": "string",
    "text": "string",
    "attachments": [
      {
        "id": "string",
        "file_size": 0,
        "unavailable": true,
        "mimetype": "string",
        "url": "string",
        "url_expires_at": 0,
        "type": "img",
        "size": {
          "width": 0,
          "height": 0
        },
        "sticker": true
      },
      {
        "id": "string",
        "file_size": 0,
        "unavailable": true,
        "mimetype": "string",
        "url": "string",
        "url_expires_at": 0,
        "type": "video",
        "size": {
          "width": 0,
          "height": 0
        },
        "gif": true
      },
      {
        "id": "string",
        "file_size": 0,
        "unavailable": true,
        "mimetype": "string",
        "url": "string",
        "url_expires_at": 0,
        "type": "audio",
        "duration": 0,
        "voice_note": true
      },
      {
        "id": "string",
        "file_size": 0,
        "unavailable": true,
        "mimetype": "string",
        "url": "string",
        "url_expires_at": 0,
        "type": "file",
        "file_name": "string"
      },
      {
        "id": "string",
        "file_size": 0,
        "unavailable": true,
        "mimetype": "string",
        "url": "string",
        "url_expires_at": 0,
        "type": "linkedin_post"
      },
      {
        "id": "string",
        "file_size": 0,
        "unavailable": true,
        "mimetype": "string",
        "url": "string",
        "url_expires_at": 0,
        "type": "video_meeting",
        "starts_at": 0,
        "expires_at": 0,
        "time_range": 0
      }
    ],
    "id": "string",
    "account_id": "string",
    "chat_id": "string",
    "chat_provider_id": "string",
    "timestamp": "string",
    "is_sender": 0,
    "quoted": {
      "provider_id": "string",
      "sender_id": "string",
      "text": "string",
      "attachments": [
        {
          "id": "string",
          "file_size": 0,
          "unavailable": true,
          "mimetype": "string",
          "url": "string",
          "url_expires_at": 0,
          "type": "img",
          "size": {
            "width": 0,
            "height": 0
          },
          "sticker": true
        },
        {
          "id": "string",
          "file_size": 0,
          "unavailable": true,
          "mimetype": "string",
          "url": "string",
          "url_expires_at": 0,
          "type": "video",
          "size": {
            "width": 0,
            "height": 0
          },
          "gif": true
        },
        {
          "id": "string",
          "file_size": 0,
          "unavailable": true,
          "mimetype": "string",
          "url": "string",
          "url_expires_at": 0,
          "type": "audio",
          "duration": 0,
          "voice_note": true
        },
        {
          "id": "string",
          "file_size": 0,
          "unavailable": true,
          "mimetype": "string",
          "url": "string",
          "url_expires_at": 0,
          "type": "file",
          "file_name": "string"
        },
        {
          "id": "string",
          "file_size": 0,
          "unavailable": true,
          "mimetype": "string",
          "url": "string",
          "url_expires_at": 0,
          "type": "linkedin_post"
        },
        {
          "id": "string",
          "file_size": 0,
          "unavailable": true,
          "mimetype": "string",
          "url": "string",
          "url_expires_at": 0,
          "type": "video_meeting",
          "starts_at": 0,
          "expires_at": 0,
          "time_range": 0
        }
      ]
    },
    "reactions": [
      {
        "value": "string",
        "sender_id": "string",
        "is_sender": true
      }
    ],
    "seen": 0,
    "seen_by": {
      "additionalProp": {}
    },
    "hidden": 0,
    "deleted": 0,
    "edited": 0,
    "is_event": 0,
    "delivered": 0,
    "behavior": 0,
    "event_type": 0,
    "original": "string",
    "replies": 0,
    "reply_by": [
      "string"
    ],
    "parent": "string",
    "sender_attendee_id": "string",
    "subject": "string",
    "message_type": "MESSAGE",
    "attendee_type": "MEMBER",
    "attendee_distance": 1,
    "sender_urn": "string",
    "reply_to": {
      "id": "string",
      "provider_id": "string",
      "timestamp": "string",
      "sender_attendee_id": "string",
      "sender_id": "string",
      "text": "string"
    }
  }
}

-------
Send a message in a chat
post
https://{subdomain}.unipile.com:{port}/api/v1/chats/{chat_id}/messages
Send a message to the given chat with the possibility to link some attachments.

Log in to see full request history
time	status	user agent	
21h ago	
400
1 Request This Month

Path Params
chat_id
string
required
The id of the chat where to send the message.

Body Params
text
string
account_id
string
An account_id can be specified to prevent the user from sending messages in chats not belonging to the account.

thread_id
string
Optional and for Slack’s messaging only. The id of the thread to send the message in.

quote_id
string
The id of a message to quote. The id of the message to quote / reply to.

voice_message
file
For Linkedin messaging only.

video_message
file
For Linkedin messaging only.

attachments
array of files

ADD file
Responses

201
Created. Message sent successfully.

Response body
object
object
string
required
MessageSent

message_id
required
The Unipile ID of the newly sent message.


string

import { UnipileClient } from "unipile-node-sdk"

// SDK setup
const BASE_URL = "your base url"
const ACCESS_TOKEN = "your access token"
// Inputs
const chat_id = "chat id"
const text = "text"

try {
	const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)

	const response = await client.messaging.sendMessage({
		chat_id,
		text,
	})
} catch (error) {
	console.log(error)
}

response
{
  "object": "MessageSent",
  "message_id": "string"
}


-----
List all accounts
get
https://{subdomain}.unipile.com:{port}/api/v1/accounts
Returns a list of the accounts linked to Unipile.

Log in to see full request history
time	status	user agent	
21h ago	
200
1 Request This Month

Query Params
cursor
string
length ≥ 1
A cursor for pagination purposes. To get the next page of entries, you need to make a new request and fulfill this field with the cursor received in the preceding request. This process should be repeated until all entries have been retrieved.

limit
integer
1 to 250
A limit for the number of items returned in the response. The value can be set between 1 and 250.

Responses

200
OK. Request succeeded.

Response body
object
object
string
required
AccountList

items
array
required

Mobile

Mail

Google

ICloud

Outlook

Google Calendar

Whatsapp

Linkedin

Slack

Twitter

Exchange

Telegram

Instagram

Messenger
cursor
required

import { UnipileClient } from "unipile-node-sdk"

const BASE_URL = "your base url"
const ACCESS_TOKEN = "your access token"

try {
	const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)

	const response = await client.account.getAll()
} catch (error) {
	console.log(error)
}

response
{
  "object": "AccountList",
  "items": [
    {
      "object": "Account",
      "type": "MOBILE",
      "connection_params": {
        "im": {
          "phone_number": "string",
          "sim_serial_number": "string"
        },
        "call": {
          "phone_number": "string",
          "sim_serial_number": "string"
        }
      },
      "last_fetched_at": "2025-12-31T23:59:59.999Z",
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "MAIL",
      "connection_params": {
        "mail": {
          "imap_host": "string",
          "imap_port": 0,
          "imap_user": "string",
          "imap_encryption": "tls",
          "smtp_host": "string",
          "smtp_port": 0,
          "smtp_user": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "GOOGLE_OAUTH",
      "connection_params": {
        "mail": {
          "id": "string",
          "username": "string"
        },
        "calendar": {
          "id": "string",
          "username": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "ICLOUD",
      "connection_params": {
        "mail": {
          "imap_host": "string",
          "imap_port": 0,
          "imap_user": "string",
          "imap_encryption": "tls",
          "smtp_host": "string",
          "smtp_port": 0,
          "smtp_user": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "OUTLOOK",
      "connection_params": {
        "mail": {
          "id": "string",
          "username": "string"
        },
        "calendar": {
          "id": "string",
          "username": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "GOOGLE_CALENDAR",
      "connection_params": {
        "calendar": "string"
      },
      "sync_token": "string",
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "WHATSAPP",
      "connection_params": {
        "im": {
          "phone_number": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "LINKEDIN",
      "connection_params": {
        "im": {
          "id": "string",
          "publicIdentifier": "string",
          "username": "string",
          "premiumId": "string",
          "premiumContractId": "string",
          "premiumFeatures": [
            "recruiter",
            "sales_navigator",
            "premium"
          ],
          "organizations": [
            {
              "name": "string",
              "messaging_enabled": true,
              "organization_urn": "string",
              "mailbox_urn": "string"
            }
          ],
          "proxy": {
            "source": "USER",
            "host": "string",
            "port": 0,
            "protocol": "http",
            "username": "string",
            "password": "string"
          }
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "SLACK",
      "connection_params": {
        "im": {
          "url": "string",
          "user": "string",
          "user_id": "string",
          "team": "string",
          "team_id": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "TWITTER",
      "connection_params": {
        "im": {
          "id": "string",
          "username": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "EXCHANGE",
      "connection_params": {
        "mail": {
          "imap_host": "string",
          "imap_port": 0,
          "imap_user": "string",
          "imap_encryption": "tls",
          "smtp_host": "string",
          "smtp_port": 0,
          "smtp_user": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "TELEGRAM",
      "connection_params": {
        "im": {
          "user_id": "string",
          "username": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "INSTAGRAM",
      "connection_params": {
        "im": {
          "id": "string",
          "username": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    },
    {
      "object": "Account",
      "type": "MESSENGER",
      "connection_params": {
        "im": {
          "id": "string",
          "username": "string"
        }
      },
      "id": "string",
      "name": "string",
      "created_at": "2025-12-31T23:59:59.999Z",
      "current_signature": "string",
      "signatures": [
        {
          "title": "string",
          "content": "string"
        }
      ],
      "groups": [
        "string"
      ],
      "sources": [
        {
          "id": "string",
          "status": "OK"
        }
      ]
    }
  ]
}

-------
Retrieve an account
get
https://{subdomain}.unipile.com:{port}/api/v1/accounts/{id}
Retrieve the details of an account.

Log in to see full request history
time	status	user agent	
Make a request to see history.
0 Requests This Month

Path Params
id
string
required
The id of the account to retrieve.

Responses

200
OK. Request succeeded.

Response body

Mobile

Mail

Google

ICloud

Outlook

Google Calendar

Whatsapp

Linkedin
object
object
string
required
Account

type
string
required
LINKEDIN

connection_params
object
required

connection_params object
id
string
required
length ≥ 1
A unique identifier.

name
string
required
created_at
string
required
An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.

current_signature
string
length ≥ 1
A unique identifier.

signatures
array of objects
object
title
string
required
content
string
required
groups
array of strings
required
sources
array of objects
required
object
id
string
required
status
required

import { UnipileClient } from "unipile-node-sdk"

// SDK setup
const BASE_URL = "your base url"
const ACCESS_TOKEN = "your access token"
// Inputs
const account_id = "account id"

try {
	const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)

	const response = await client.account.getOne(account_id)
} catch (error) {
	console.log(error)
}
{
  "object": "Account",
  "type": "MOBILE",
  "connection_params": {
    "im": {
      "phone_number": "string",
      "sim_serial_number": "string"
    },
    "call": {
      "phone_number": "string",
      "sim_serial_number": "string"
    }
  },
  "last_fetched_at": "2025-12-31T23:59:59.999Z",
  "id": "string",
  "name": "string",
  "created_at": "2025-12-31T23:59:59.999Z",
  "current_signature": "string",
  "signatures": [
    {
      "title": "string",
      "content": "string"
    }
  ],
  "groups": [
    "string"
  ],
  "sources": [
    {
      "id": "string",
      "status": "OK"
    }
  ]
}