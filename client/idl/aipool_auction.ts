/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aipool_auction.json`.
 */
export type AipoolAuction = {
  "address": "Auctn5jG7vS8SAH1LWvyKF1vWJbMFzXeMJjBQGdiWUZu",
  "metadata": {
    "name": "aipoolAuction",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "closeEscrow",
      "discriminator": [
        139,
        171,
        94,
        146,
        191,
        91,
        144,
        50
      ],
      "accounts": [
        {
          "name": "auction"
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeIndex",
      "discriminator": [
        204,
        67,
        3,
        74,
        139,
        139,
        233,
        10
      ],
      "accounts": [
        {
          "name": "auctionsIndexer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110,
                  115,
                  95,
                  105,
                  110,
                  100,
                  101,
                  120,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placeBid",
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bid",
          "type": "u64"
        },
        {
          "name": "twitterHandle",
          "type": "string"
        }
      ]
    },
    {
      "name": "startAuction",
      "discriminator": [
        255,
        2,
        149,
        136,
        148,
        125,
        65,
        195
      ],
      "accounts": [
        {
          "name": "auctionsIndexer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110,
                  115,
                  95,
                  105,
                  110,
                  100,
                  101,
                  120,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "previousAuction",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auctions_indexer.auctions_counter",
                "account": "auctionsIndexer"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "auction.highest_bidder",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true,
          "address": "EvkcRXSPZactUN5dEHpWXtxnQrZR1NbtFrVGufF3Svr1"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "auctionsIndexer",
      "discriminator": [
        191,
        147,
        63,
        5,
        214,
        139,
        10,
        176
      ]
    },
    {
      "name": "bidEscrow",
      "discriminator": [
        146,
        219,
        14,
        4,
        42,
        183,
        243,
        215
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "bidTooLow",
      "msg": "Bid is too low"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6002,
      "name": "auctionExpired",
      "msg": "Auction is expired"
    },
    {
      "code": 6003,
      "name": "auctionNotExpired",
      "msg": "Auction not expired"
    },
    {
      "code": 6004,
      "name": "auctionWithdrawnAlready",
      "msg": "Auction withdraw already exectued"
    },
    {
      "code": 6005,
      "name": "ongoingAuction",
      "msg": "Last auction has not been completed yet"
    },
    {
      "code": 6006,
      "name": "auctionNotActive",
      "msg": "Auction is not active"
    },
    {
      "code": 6007,
      "name": "auctionNotEnded",
      "msg": "Auction has not ended"
    },
    {
      "code": 6008,
      "name": "unauthorizedRecipient",
      "msg": "Unauthorized recipient"
    },
    {
      "code": 6009,
      "name": "invalidSize",
      "msg": "Invalid size"
    },
    {
      "code": 6010,
      "name": "invalidBidder",
      "msg": "Invalid best bidder"
    },
    {
      "code": 6011,
      "name": "invalidTwitter",
      "msg": "Invalid twitter"
    },
    {
      "code": 6012,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6013,
      "name": "previousBidder",
      "msg": "Previous bidder different"
    },
    {
      "code": 6014,
      "name": "missingAuction",
      "msg": "Missing auction"
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "indexerCounter",
            "type": "u64"
          },
          {
            "name": "twitterHandle",
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "highestBid",
            "type": "u64"
          },
          {
            "name": "highestBidder",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "withdrawn",
            "type": "bool"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                48
              ]
            }
          }
        ]
      }
    },
    {
      "name": "auctionsIndexer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "auctionsCounter",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bidEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "indexerCounter",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                48
              ]
            }
          }
        ]
      }
    }
  ]
};
