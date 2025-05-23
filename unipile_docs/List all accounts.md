# List all accounts

Returns a list of the accounts linked to Unipile.


# OpenAPI definition
```json
{
  "openapi": "3.0.0",
  "paths": {
    "/api/v1/accounts": {
      "get": {
        "operationId": "AccountsController_listAccounts",
        "x-readme": {
          "code-samples": [
            {
              "language": "node",
              "code": "import { UnipileClient } from \"unipile-node-sdk\"\n\nconst BASE_URL = \"your base url\"\nconst ACCESS_TOKEN = \"your access token\"\n\ntry {\n\tconst client = new UnipileClient(BASE_URL, ACCESS_TOKEN)\n\n\tconst response = await client.account.getAll()\n} catch (error) {\n\tconsole.log(error)\n}",
              "name": "unipile-node-sdk",
              "install": "npm install unipile-node-sdk"
            }
          ]
        },
        "summary": "List all accounts",
        "description": "Returns a list of the accounts linked to Unipile.",
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
            "description": "OK. Request succeeded.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "object": {
                      "type": "string",
                      "enum": [
                        "AccountList"
                      ]
                    },
                    "items": {
                      "type": "array",
                      "items": {
                        "anyOf": [
                          {
                            "title": "Mobile",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "MOBILE"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "phone_number": {
                                        "type": "string"
                                      },
                                      "sim_serial_number": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "phone_number",
                                      "sim_serial_number"
                                    ]
                                  },
                                  "call": {
                                    "type": "object",
                                    "properties": {
                                      "phone_number": {
                                        "type": "string"
                                      },
                                      "sim_serial_number": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "phone_number",
                                      "sim_serial_number"
                                    ]
                                  }
                                },
                                "required": [
                                  "im",
                                  "call"
                                ]
                              },
                              "last_fetched_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Mail",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "MAIL"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "mail": {
                                    "type": "object",
                                    "properties": {
                                      "imap_host": {
                                        "type": "string"
                                      },
                                      "imap_port": {
                                        "type": "number"
                                      },
                                      "imap_user": {
                                        "type": "string"
                                      },
                                      "imap_encryption": {
                                        "anyOf": [
                                          {
                                            "type": "string",
                                            "enum": [
                                              "tls"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "ssl"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "starttls"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "default"
                                            ]
                                          }
                                        ]
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
                                  "mail"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Google",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "GOOGLE_OAUTH"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "mail": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  },
                                  "calendar": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  }
                                },
                                "required": [
                                  "mail",
                                  "calendar"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "ICloud",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "ICLOUD"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "mail": {
                                    "type": "object",
                                    "properties": {
                                      "imap_host": {
                                        "type": "string"
                                      },
                                      "imap_port": {
                                        "type": "number"
                                      },
                                      "imap_user": {
                                        "type": "string"
                                      },
                                      "imap_encryption": {
                                        "anyOf": [
                                          {
                                            "type": "string",
                                            "enum": [
                                              "tls"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "ssl"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "starttls"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "default"
                                            ]
                                          }
                                        ]
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
                                  "mail"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Outlook",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "OUTLOOK"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "mail": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  },
                                  "calendar": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  }
                                },
                                "required": [
                                  "mail",
                                  "calendar"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Google Calendar",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "GOOGLE_CALENDAR"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "calendar": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "calendar"
                                ]
                              },
                              "sync_token": {
                                "type": "string"
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Whatsapp",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "WHATSAPP"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "phone_number": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "phone_number"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Linkedin",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "LINKEDIN"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "publicIdentifier": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      },
                                      "premiumId": {
                                        "anyOf": [
                                          {
                                            "type": "string"
                                          },
                                          {
                                            "nullable": true
                                          }
                                        ]
                                      },
                                      "premiumContractId": {
                                        "anyOf": [
                                          {
                                            "type": "string"
                                          },
                                          {
                                            "nullable": true
                                          }
                                        ]
                                      },
                                      "premiumFeatures": {
                                        "type": "array",
                                        "items": {
                                          "anyOf": [
                                            {
                                              "type": "string",
                                              "enum": [
                                                "recruiter"
                                              ]
                                            },
                                            {
                                              "type": "string",
                                              "enum": [
                                                "sales_navigator"
                                              ]
                                            },
                                            {
                                              "type": "string",
                                              "enum": [
                                                "premium"
                                              ]
                                            }
                                          ]
                                        }
                                      },
                                      "organizations": {
                                        "type": "array",
                                        "items": {
                                          "type": "object",
                                          "properties": {
                                            "name": {
                                              "type": "string"
                                            },
                                            "messaging_enabled": {
                                              "type": "boolean"
                                            },
                                            "organization_urn": {
                                              "type": "string"
                                            },
                                            "mailbox_urn": {
                                              "type": "string"
                                            }
                                          },
                                          "required": [
                                            "name",
                                            "messaging_enabled",
                                            "organization_urn",
                                            "mailbox_urn"
                                          ]
                                        }
                                      },
                                      "proxy": {
                                        "type": "object",
                                        "properties": {
                                          "source": {
                                            "type": "string",
                                            "enum": [
                                              "USER"
                                            ]
                                          },
                                          "host": {
                                            "type": "string"
                                          },
                                          "port": {
                                            "type": "number"
                                          },
                                          "protocol": {
                                            "anyOf": [
                                              {
                                                "type": "string",
                                                "enum": [
                                                  "http"
                                                ]
                                              },
                                              {
                                                "type": "string",
                                                "enum": [
                                                  "https"
                                                ]
                                              },
                                              {
                                                "type": "string",
                                                "enum": [
                                                  "socks5"
                                                ]
                                              }
                                            ]
                                          },
                                          "username": {
                                            "type": "string"
                                          },
                                          "password": {
                                            "type": "string"
                                          }
                                        },
                                        "required": [
                                          "source",
                                          "host",
                                          "port"
                                        ]
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username",
                                      "premiumId",
                                      "premiumContractId",
                                      "organizations"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Slack",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "SLACK"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "url": {
                                        "type": "string"
                                      },
                                      "user": {
                                        "type": "string"
                                      },
                                      "user_id": {
                                        "type": "string"
                                      },
                                      "team": {
                                        "type": "string"
                                      },
                                      "team_id": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "url",
                                      "user",
                                      "user_id",
                                      "team",
                                      "team_id"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Twitter",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "TWITTER"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Exchange",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "EXCHANGE"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "mail": {
                                    "type": "object",
                                    "properties": {
                                      "imap_host": {
                                        "type": "string"
                                      },
                                      "imap_port": {
                                        "type": "number"
                                      },
                                      "imap_user": {
                                        "type": "string"
                                      },
                                      "imap_encryption": {
                                        "anyOf": [
                                          {
                                            "type": "string",
                                            "enum": [
                                              "tls"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "ssl"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "starttls"
                                            ]
                                          },
                                          {
                                            "type": "string",
                                            "enum": [
                                              "default"
                                            ]
                                          }
                                        ]
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
                                  "mail"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Telegram",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "TELEGRAM"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "user_id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "user_id",
                                      "username"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Instagram",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "INSTAGRAM"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          },
                          {
                            "title": "Messenger",
                            "type": "object",
                            "properties": {
                              "object": {
                                "type": "string",
                                "enum": [
                                  "Account"
                                ]
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "MESSENGER"
                                ]
                              },
                              "connection_params": {
                                "type": "object",
                                "properties": {
                                  "im": {
                                    "type": "object",
                                    "properties": {
                                      "id": {
                                        "type": "string"
                                      },
                                      "username": {
                                        "type": "string"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "username"
                                    ]
                                  }
                                },
                                "required": [
                                  "im"
                                ]
                              },
                              "id": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "name": {
                                "type": "string"
                              },
                              "created_at": {
                                "description": "An ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SS.sssZ). ⚠️ All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.",
                                "example": "2025-12-31T23:59:59.999Z",
                                "pattern": "^[1-2]\\d{3}-[0-1]\\d-[0-3]\\dT\\d{2}:\\d{2}:\\d{2}.\\d{3}Z$"
                              },
                              "current_signature": {
                                "title": "UniqueId",
                                "description": "A unique identifier.",
                                "minLength": 1,
                                "type": "string"
                              },
                              "signatures": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "title": {
                                      "type": "string"
                                    },
                                    "content": {
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "title",
                                    "content"
                                  ]
                                }
                              },
                              "groups": {
                                "type": "array",
                                "items": {
                                  "title": "UniqueId",
                                  "description": "A unique identifier.",
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "sources": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "title": "AccountSourceServiceStatus",
                                      "anyOf": [
                                        {
                                          "title": "OK",
                                          "description": "The Service is running normally.",
                                          "type": "string",
                                          "enum": [
                                            "OK"
                                          ]
                                        },
                                        {
                                          "title": "STOPPED",
                                          "description": "The Service has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "STOPPED"
                                          ]
                                        },
                                        {
                                          "title": "ERROR",
                                          "description": "The Service has encountered an unspecified error and has been stopped.",
                                          "type": "string",
                                          "enum": [
                                            "ERROR"
                                          ]
                                        },
                                        {
                                          "title": "CREDENTIALS",
                                          "description": "Credentials needs to be refreshed for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "CREDENTIALS"
                                          ]
                                        },
                                        {
                                          "title": "PERMISSIONS",
                                          "description": "Some permissions are missing on the host Device for the Service to be able to run.",
                                          "type": "string",
                                          "enum": [
                                            "PERMISSIONS"
                                          ]
                                        },
                                        {
                                          "title": "CONNECTING",
                                          "description": "The Service is connecting.",
                                          "type": "string",
                                          "enum": [
                                            "CONNECTING"
                                          ]
                                        }
                                      ]
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "status"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "object",
                              "type",
                              "connection_params",
                              "id",
                              "name",
                              "created_at",
                              "groups",
                              "sources"
                            ]
                          }
                        ]
                      }
                    },
                    "cursor": {
                      "anyOf": [
                        {},
                        {
                          "title": "null",
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
          "400": {
            "description": "## Bad Request\n\n### Invalid parameters - Type: \"errors/invalid_parameters\"\nOne or more request parameters are invalid or missing.\n\n### Missing parameters - Type: \"errors/missing_parameters\"\nOne or more request parameters are missing.\n\n### Invalid parameters - Type: \"errors/invalid_request\"\nOne or a combination of request parameters are invalid.\n\n### Malformed request - Type: \"errors/malformed_request\"\nThe given request has been rejected by the provider.\n\n### Content too large - Type: \"errors/content_too_large\"\nThe request payload is so large that it has been rejected by the provider.\n\n### Too many characters - Type: \"errors/too_many_characters\"\nThe provided content exceeds the character limit.\n\n### Unescaped characters - Type: \"errors/unescaped_characters\"\nThe request path contains unescaped characters.",
            "content": {
              "application/json": {
                "schema": {
                  "title": "BadRequestResponse",
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
                        "errors/invalid_parameters",
                        "errors/malformed_request",
                        "errors/content_too_large",
                        "errors/invalid_url",
                        "errors/too_many_characters",
                        "errors/unescaped_characters",
                        "errors/missing_parameters"
                      ]
                    },
                    "status": {
                      "type": "number",
                      "enum": [
                        400
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
          "Accounts"
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
      "name": "Accounts",
      "description": "Accounts  management",
      "externalDocs": {
        "url": "https://www.unipile.com/integrations/",
        "description": "Related guide : Integrations"
      }
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