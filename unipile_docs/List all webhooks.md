# List all webhooks

Returns a list of the webhooks.


# OpenAPI definition
```json
{
  "openapi": "3.0.0",
  "paths": {
    "/api/v1/webhooks": {
      "get": {
        "operationId": "WebhooksController_listWebhooks",
        "summary": "List all webhooks",
        "description": "Returns a list of the webhooks.",
        "parameters": [
          {
            "name": "cursor",
            "required": false,
            "in": "query",
            "schema": {
              "title": "CursorParam",
              "description": "A cursor for pagination purposes. To get the next page of entries, you need to make a new request and fulfill this field with the cursor received in the preceding request. This process should be repeated until all entries have been retrieved.",
              "minLength": 1,
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 250,
              "description": "A limit for the number of items returned in the response. The value can be set between 1 and 250.",
              "example": 100,
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK. Request succeeded",
            "content": {
              "application/json": {
                "schema": {
                  "description": "@todo",
                  "type": "object",
                  "properties": {
                    "object": {
                      "type": "string",
                      "enum": [
                        "WebhookList"
                      ]
                    },
                    "items": {
                      "type": "array",
                      "items": {
                        "anyOf": [
                          {
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Webhook"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "account_ids": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "title": "UniqueId",
                                      "description": "A unique identifier.",
                                      "minLength": 1,
                                      "type": "string"
                                    },
                                    "name": {
                                      "type": "string"
                                    },
                                    "type": {
                                      "anyOf": [
                                        {
                                          "type": "string",
                                          "enum": [
                                            "GOOGLE"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "GOOGLE_CALENDAR"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "ICLOUD"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "LINKEDIN"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "MAIL"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "MOBILE"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "OUTLOOK"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "TWITTER"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "WHATSAPP"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "SLACK"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "TELEGRAM"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "type"
                                  ]
                                }
                              },
                              "enabled": {
                                "type": "boolean"
                              },
                              "name": {
                                "type": "string"
                              },
                              "request_url": {
                                "type": "string"
                              },
                              "format": {
                                "description": "The format of data you recieve from the webhook. Accepted values: json | form",
                                "example": "json",
                                "type": "string",
                                "enum": [
                                  "json",
                                  "form"
                                ]
                              },
                              "headers": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "key": {
                                      "type": "string"
                                    },
                                    "value": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "key",
                                    "value"
                                  ]
                                }
                              },
                              "data": {
                                "anyOf": [
                                  {
                                    "type": "array",
                                    "items": {
                                      "description": "You can use this field to change the name of the properties you will receive from the webhook.",
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "description": "The name of the property you want to receive. It will replace the original name of the property.",
                                          "type": "string"
                                        },
                                        "key": {
                                          "type": "string",
                                          "enum": [
                                            "account_id",
                                            "account_type",
                                            "account_info",
                                            "chat_id",
                                            "timestamp",
                                            "webhook_name",
                                            "message_id",
                                            "message",
                                            "reaction",
                                            "reaction_sender",
                                            "sender",
                                            "attendees",
                                            "attachments",
                                            "subject",
                                            "provider_chat_id",
                                            "provider_message_id",
                                            "is_event",
                                            "quoted",
                                            "chat_content_type",
                                            "message_type"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "name",
                                        "key"
                                      ]
                                    }
                                  },
                                  {
                                    "type": "array",
                                    "items": {
                                      "description": "You can use this field to change the name of the properties you will receive from the webhook.",
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "description": "The name of the property you want to receive. It will replace the original name of the property.",
                                          "type": "string"
                                        },
                                        "key": {
                                          "type": "string",
                                          "enum": [
                                            "email_id",
                                            "account_id",
                                            "webhook_name",
                                            "date",
                                            "from_attendee",
                                            "to_attendees",
                                            "cc_attendees",
                                            "bcc_attendees",
                                            "reply_to_attendees",
                                            "subject",
                                            "body",
                                            "body_plain",
                                            "message_id",
                                            "provider_id",
                                            "tracking_id",
                                            "read_date",
                                            "is_complete",
                                            "in_reply_to",
                                            "has_attachments",
                                            "attachments",
                                            "folders",
                                            "role",
                                            "origin",
                                            "thread_id",
                                            "deprecated_id"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "name",
                                        "key"
                                      ]
                                    }
                                  },
                                  {
                                    "type": "array",
                                    "items": {
                                      "description": "You can use this field to change the name of the properties you will receive from the webhook.",
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "description": "The name of the property you want to receive. It will replace the original name of the property.",
                                          "type": "string"
                                        },
                                        "key": {
                                          "type": "string",
                                          "enum": [
                                            "event_id",
                                            "tracking_id",
                                            "type",
                                            "date",
                                            "email_id",
                                            "account_id",
                                            "ip",
                                            "user_agent",
                                            "url",
                                            "label",
                                            "custom_domain"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "name",
                                        "key"
                                      ]
                                    }
                                  }
                                ]
                              },
                              "events": {
                                "type": "array",
                                "items": {
                                  "anyOf": [
                                    {
                                      "type": "string",
                                      "enum": [
                                        "message_received",
                                        "message_read",
                                        "message_reaction",
                                        "message_edited",
                                        "message_deleted"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "mail_sent",
                                        "mail_received"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "mail_opened",
                                        "mail_link_clicked"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "creation_success",
                                        "creation_fail",
                                        "deleted",
                                        "reconnected",
                                        "sync_success",
                                        "stopped",
                                        "ok",
                                        "connecting",
                                        "error",
                                        "credentials",
                                        "permissions"
                                      ]
                                    }
                                  ]
                                }
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "AUTO"
                                ]
                              }
                            },
                            "required": [
                              "object",
                              "id",
                              "account_ids",
                              "enabled",
                              "request_url",
                              "format",
                              "headers",
                              "data",
                              "type"
                            ]
                          },
                          {
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Webhook"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "account_ids": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "title": "UniqueId",
                                      "description": "A unique identifier.",
                                      "minLength": 1,
                                      "type": "string"
                                    },
                                    "name": {
                                      "type": "string"
                                    },
                                    "type": {
                                      "anyOf": [
                                        {
                                          "type": "string",
                                          "enum": [
                                            "GOOGLE"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "GOOGLE_CALENDAR"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "ICLOUD"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "LINKEDIN"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "MAIL"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "MOBILE"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "OUTLOOK"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "TWITTER"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "WHATSAPP"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "SLACK"
                                          ]
                                        },
                                        {
                                          "type": "string",
                                          "enum": [
                                            "TELEGRAM"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "type"
                                  ]
                                }
                              },
                              "enabled": {
                                "type": "boolean"
                              },
                              "name": {
                                "type": "string"
                              },
                              "request_url": {
                                "type": "string"
                              },
                              "format": {
                                "description": "The format of data you recieve from the webhook. Accepted values: json | form",
                                "example": "json",
                                "type": "string",
                                "enum": [
                                  "json",
                                  "form"
                                ]
                              },
                              "headers": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "key": {
                                      "type": "string"
                                    },
                                    "value": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "key",
                                    "value"
                                  ]
                                }
                              },
                              "data": {
                                "anyOf": [
                                  {
                                    "type": "array",
                                    "items": {
                                      "description": "You can use this field to change the name of the properties you will receive from the webhook.",
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "description": "The name of the property you want to receive. It will replace the original name of the property.",
                                          "type": "string"
                                        },
                                        "key": {
                                          "type": "string",
                                          "enum": [
                                            "account_id",
                                            "account_type",
                                            "account_info",
                                            "chat_id",
                                            "timestamp",
                                            "webhook_name",
                                            "message_id",
                                            "message",
                                            "reaction",
                                            "reaction_sender",
                                            "sender",
                                            "attendees",
                                            "attachments",
                                            "subject",
                                            "provider_chat_id",
                                            "provider_message_id",
                                            "is_event",
                                            "quoted",
                                            "chat_content_type",
                                            "message_type"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "name",
                                        "key"
                                      ]
                                    }
                                  },
                                  {
                                    "type": "array",
                                    "items": {
                                      "description": "You can use this field to change the name of the properties you will receive from the webhook.",
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "description": "The name of the property you want to receive. It will replace the original name of the property.",
                                          "type": "string"
                                        },
                                        "key": {
                                          "type": "string",
                                          "enum": [
                                            "email_id",
                                            "account_id",
                                            "webhook_name",
                                            "date",
                                            "from_attendee",
                                            "to_attendees",
                                            "cc_attendees",
                                            "bcc_attendees",
                                            "reply_to_attendees",
                                            "subject",
                                            "body",
                                            "body_plain",
                                            "message_id",
                                            "provider_id",
                                            "tracking_id",
                                            "read_date",
                                            "is_complete",
                                            "in_reply_to",
                                            "has_attachments",
                                            "attachments",
                                            "folders",
                                            "role",
                                            "origin",
                                            "thread_id",
                                            "deprecated_id"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "name",
                                        "key"
                                      ]
                                    }
                                  },
                                  {
                                    "type": "array",
                                    "items": {
                                      "description": "You can use this field to change the name of the properties you will receive from the webhook.",
                                      "type": "object",
                                      "properties": {
                                        "name": {
                                          "description": "The name of the property you want to receive. It will replace the original name of the property.",
                                          "type": "string"
                                        },
                                        "key": {
                                          "type": "string",
                                          "enum": [
                                            "event_id",
                                            "tracking_id",
                                            "type",
                                            "date",
                                            "email_id",
                                            "account_id",
                                            "ip",
                                            "user_agent",
                                            "url",
                                            "label",
                                            "custom_domain"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "name",
                                        "key"
                                      ]
                                    }
                                  }
                                ]
                              },
                              "events": {
                                "type": "array",
                                "items": {
                                  "anyOf": [
                                    {
                                      "type": "string",
                                      "enum": [
                                        "message_received",
                                        "message_read",
                                        "message_reaction",
                                        "message_edited",
                                        "message_deleted"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "mail_sent",
                                        "mail_received"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "mail_opened",
                                        "mail_link_clicked"
                                      ]
                                    },
                                    {
                                      "type": "string",
                                      "enum": [
                                        "creation_success",
                                        "creation_fail",
                                        "deleted",
                                        "reconnected",
                                        "sync_success",
                                        "stopped",
                                        "ok",
                                        "connecting",
                                        "error",
                                        "credentials",
                                        "permissions"
                                      ]
                                    }
                                  ]
                                }
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "TRIGGER"
                                ]
                              },
                              "trigger": {
                                "type": "object",
                                "properties": {
                                  "icon": {
                                    "anyOf": [
                                      {
                                        "type": "string",
                                        "enum": [
                                          "WebhookIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "SettingsInputIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "LeakAddIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "Diversity2Icon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "AutoFixHighIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "SignPostIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "ShutterSpeedIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "SyncAltIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "WhatsAppIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "LinkedInIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "ImportExportIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "PodcastsIcon"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "CableIcon"
                                        ]
                                      }
                                    ]
                                  },
                                  "name": {
                                    "type": "string"
                                  },
                                  "context": {
                                    "anyOf": [
                                      {
                                        "type": "string",
                                        "enum": [
                                          "MESSAGE"
                                        ]
                                      },
                                      {
                                        "type": "string",
                                        "enum": [
                                          "CHAT"
                                        ]
                                      }
                                    ]
                                  }
                                },
                                "required": [
                                  "icon",
                                  "name",
                                  "context"
                                ]
                              }
                            },
                            "required": [
                              "object",
                              "id",
                              "account_ids",
                              "enabled",
                              "request_url",
                              "format",
                              "headers",
                              "data",
                              "type",
                              "trigger"
                            ]
                          }
                        ]
                      }
                    },
                    "cursor": {
                      "anyOf": [
                        {},
                        {
                          "nullable": true
                        }
                      ]
                    }
                  },
                  "required": [
                    "object",
                    "items",
                    "cursor"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "## Unauthorized\n\n### Missing credentials - Type: \"errors/missing_credentials\"\nSome credentials are necessary to perform the request.\n\n### Multiple sessions - Type: \"errors/multiple_sessions\"\nLinkedIn limits the use of multiple sessions on certain Recruiter accounts. This error restricts access to this route only, but causing a popup to appear in the user's browser, prompting them to choose a session, which can disconnect the current account. To avoid this error, use the cookie connection method.\n\n### Wrong account - Type: \"errors/wrong_account\"\nThe provided credentials do not match the correct account.\n\n### Invalid credentials - Type: \"errors/invalid_credentials\"\nThe provided credentials are invalid.\n\n### Invalid IMAP configuration - Type: \"errors/invalid_imap_configuration\"\nThe provided IMAP configuration is invalid.\n\n### Invalid SMTP configuration - Type: \"errors/invalid_smtp_configuration\"\nThe provided SMTP configuration is invalid.\n\n### Invalid checkpoint solution - Type: \"errors/invalid_checkpoint_solution\"\nThe checkpoint resolution did not pass successfully. Please retry.\n\n### Checkpoint error - Type: \"errors/checkpoint_error\"\nThe checkpoint does not appear to be resolvable. Please try again and contact support if the problem persists.\n\n### Expired credentials - Type: \"errors/expired_credentials\"\nInvalid credentials. Please check your username and password and try again.\n\n### Expired link - Type: \"errors/expired_link\"\nThis link has expired. Please return to the application and generate a new one.\n\n### Insufficient privileges - Type: \"errors/insufficient_privileges\"\nThis resource seems to be out of your scopes.\n\n### Disconnected account - Type: \"errors/disconnected_account\"\nThe account appears to be disconnected from the provider service.\n\n### Disconnected feature - Type: \"errors/disconnected_feature\"\nThe service you're trying to reach appears to be disconnected.",
            "content": {
              "application/json": {
                "schema": {
                  "title": "UnauthorizedResponse",
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "detail": {
                      "type": "string"
                    },
                    "instance": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "errors/missing_credentials",
                        "errors/multiple_sessions",
                        "errors/invalid_checkpoint_solution",
                        "errors/checkpoint_error",
                        "errors/invalid_credentials",
                        "errors/expired_credentials",
                        "errors/insufficient_privileges",
                        "errors/disconnected_account",
                        "errors/disconnected_feature",
                        "errors/invalid_credentials_but_valid_account_imap",
                        "errors/expired_link",
                        "errors/wrong_account"
                      ]
                    },
                    "status": {
                      "type": "number",
                      "enum": [
                        401
                      ]
                    },
                    "connectionParams": {
                      "type": "object",
                      "properties": {
                        "imap_host": {
                          "type": "string"
                        },
                        "imap_encryption": {
                          "type": "string"
                        },
                        "imap_port": {
                          "type": "number"
                        },
                        "imap_user": {
                          "type": "string"
                        },
                        "smtp_host": {
                          "type": "string"
                        },
                        "smtp_port": {
                          "type": "number"
                        },
                        "smtp_user": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "imap_host",
                        "imap_port",
                        "imap_user",
                        "smtp_host",
                        "smtp_port",
                        "smtp_user"
                      ]
                    }
                  },
                  "required": [
                    "title",
                    "type",
                    "status"
                  ]
                }
              }
            }
          },
          "403": {
            "description": "## Forbidden\n\n### Insufficient permissions - Type: \"errors/insufficient_permissions\"\nValid authentication but insufficient permissions to perform the request.\n\n### Account restricted - Type: \"errors/account_restricted\"\nAccess to this account has been restricted by the provider.\n\n### Account mismatch - Type: \"errors/account_mismatch\"\nThis action cannot be done with your account.\n\n### Unknown authentication context - Type: \"errors/unknown_authentication_context\"\nAn additional step seems necessary to complete login. Please connect to Linkedin with your browser to find out more, then retry authentication.\n\n### Session mismatch - Type: \"errors/session_mismatch\"\nToken User id does not match client session id.\n\n### Feature not subscribed - Type: \"errors/feature_not_subscribed\"\nThe requested feature has either not been subscribed or not been authenticated properly.\n\n### Resource access restricted - Type: \"errors/resource_access_restricted\"\nYou don't have access to this resource.",
            "content": {
              "application/json": {
                "schema": {
                  "title": "ForbiddenResponse",
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "detail": {
                      "type": "string"
                    },
                    "instance": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "errors/account_restricted",
                        "errors/account_mismatch",
                        "errors/insufficient_permissions",
                        "errors/session_mismatch",
                        "errors/feature_not_subscribed",
                        "errors/unknown_authentication_context",
                        "errors/resource_access_restricted"
                      ]
                    },
                    "status": {
                      "type": "number",
                      "enum": [
                        403
                      ]
                    }
                  },
                  "required": [
                    "title",
                    "type",
                    "status"
                  ]
                }
              }
            }
          },
          "500": {
            "description": "## Internal Server Error\n\n### Unexpected error - Type: \"errors/unexpected_error\"\nSomething went wrong. {{moreDetails}}\n\n### Provider error - Type: \"errors/provider_error\"\nThe provider is experiencing operational problems. Please try again later.\n\n### Authentication intent error - Type: \"errors/authentication_intent_error\"\nThe current authentication intent was killed after failure. Please start the process again from the beginning.",
            "content": {
              "application/json": {
                "schema": {
                  "title": "InternalServerErrorResponse",
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "detail": {
                      "type": "string"
                    },
                    "instance": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "errors/unexpected_error",
                        "errors/provider_error",
                        "errors/authentication_intent_error"
                      ]
                    },
                    "status": {
                      "type": "number",
                      "enum": [
                        500
                      ]
                    }
                  },
                  "required": [
                    "title",
                    "type",
                    "status"
                  ]
                }
              }
            }
          },
          "503": {
            "description": "## Service Unavailable\n\n### No client session - Type: \"errors/no_client_session\"\nNo client session is currently running.\n\n### No channel - Type: \"errors/no_channel\"\nNo channel to client session.\n\n### Handler missing - Type: \"errors/no_handler\"\nHandler missing for that request.\n\n### Network down - Type: \"errors/network_down\"\nNetwork is down on server side. Please wait a moment and retry.\n\n### Service unavailable - Type: \"errors/service_unavailable\"\nPlease try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "title": "ServiceUnavailableResponse",
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "detail": {
                      "type": "string"
                    },
                    "instance": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "errors/no_client_session",
                        "errors/no_channel",
                        "errors/no_handler",
                        "errors/network_down",
                        "errors/service_unavailable"
                      ]
                    },
                    "status": {
                      "type": "number",
                      "enum": [
                        503
                      ]
                    }
                  },
                  "required": [
                    "title",
                    "type",
                    "status"
                  ]
                }
              }
            }
          },
          "504": {
            "description": "## Gateway Timeout\n\n### Request timed out - Type: \"errors/request_timeout\"\nRequest Timeout. Please try again, and if the issue persists, contact support.",
            "content": {
              "application/json": {
                "schema": {
                  "title": "GatewayTimeoutResponse",
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "detail": {
                      "type": "string"
                    },
                    "instance": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "errors/request_timeout"
                      ]
                    },
                    "status": {
                      "type": "number",
                      "enum": [
                        504
                      ]
                    }
                  },
                  "required": [
                    "title",
                    "type",
                    "status"
                  ]
                }
              }
            }
          }
        },
        "tags": [
          "Webhooks"
        ],
        "security": [
          {
            "Access-Token": []
          }
        ]
      }
    }
  },
  "info": {
    "title": "Unipile API Reference",
    "description": "Unipile Communication is an **HTTP API**. It has predictable resource-oriented `URLs`, accepts **form-encoded** or **JSON-encoded** request bodies, returns **JSON-encoded responses**, and uses standard HTTP response codes, authentication, and verbs.",
    "version": "1.0",
    "contact": {}
  },
  "tags": [
    {
      "name": "Webhooks",
      "description": "Webhooks management"
    }
  ],
  "servers": [
    {
      "url": "https://{subdomain}.unipile.com:{port}",
      "description": "live server",
      "variables": {
        "subdomain": {
          "default": "api1"
        },
        "port": {
          "default": "13111"
        }
      }
    },
    {
      "url": "http://127.0.0.1:3114"
    }
  ],
  "components": {
    "securitySchemes": {
      "Access-Token": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-KEY"
      }
    }
  },
  "x-readme": {
    "explorer-enabled": true,
    "proxy-enabled": true
  },
  "_id": "654cacb148798d000bf66ba2"
}
```