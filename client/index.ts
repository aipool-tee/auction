// **** For SVELTE **** packages 0.1.xxx use this
// import {
//   Program,
//   AnchorProvider,
//   Wallet,
//   BN,
//   IdlAccounts,
// } from "@coral-xyz/anchor";

// **** FOR ELIZA  AND SCRIPTS **** packages 0.0.xxx use this
import { IdlAccounts, Wallet, Program } from "@coral-xyz/anchor";
import pkg from "@coral-xyz/anchor";
const { AnchorProvider, BN } = pkg;

// **** - **** - **** 

import {
  PublicKey,
  SystemProgram,
  Connection,
  Keypair,
  TransactionInstruction,
  AccountInfo,
} from "@solana/web3.js";
import idl from "./idl/aipool_auction.json"  with { type: "json" };
import type { AipoolAuction } from "./idl/aipool_auction";

export const ADMIN = "8kvqgxQG77pv6RvEou8f2kHSWi3rtx8F7MksXUqNLGmn";
export const RECIPIENT = "8kvqgxQG77pv6RvEou8f2kHSWi3rtx8F7MksXUqNLGmn";
const AUCTIONS_INDEXER_SEEDS = "auctions_indexer";
const AUCTION_SEEDS = "auction";
const BID_SEEDS = "bid";
type AipoolAuctionAccount = IdlAccounts<AipoolAuction>["auction"];

export class AipoolAuctionClient {
  private program: Program<AipoolAuction>;
  wallet: Wallet;
  programId: PublicKey;
  connection: Connection;

  constructor(connection: Connection) {
    this.program = new Program<AipoolAuction>(idl as any, { connection });
    this.programId = this.program.programId;
    this.wallet = null as any;
    this.connection = connection;
  }

  setWallet(wallet: Wallet) {
    this.wallet = wallet;
    this.program = new Program<AipoolAuction>(
      idl as any,
      new AnchorProvider(this.connection, wallet)
    );
  }

  async initializeIndex(): Promise<TransactionInstruction> {
    return await this.program.methods
      .initializeIndex()
      .accounts({
        admin: this.wallet.publicKey,
      })
      .instruction();
  }

  async startAuction(): Promise<TransactionInstruction> {
    let txIx: TransactionInstruction;
    const [auctionsIndexerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(AUCTIONS_INDEXER_SEEDS)],
      this.program.programId
    );
    let auctionsIndexerAccount =
      await this.program.account.auctionsIndexer.fetch(auctionsIndexerPDA);
    const auctionCounter = auctionsIndexerAccount.auctionsCounter.add(
      new BN(1)
    );

    const [auctionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(AUCTION_SEEDS), auctionCounter.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );

    if (auctionCounter.toNumber() == 1) {
      txIx = 
        await this.program.methods
          .startAuction()
          .accountsPartial({
            previousAuction: null,
            auction: auctionPDA,
          })
          .instruction()
      ;
    } else {
      txIx = 
        await this.program.methods
          .startAuction()
          .accounts({
            auction: auctionPDA,
          })
          .instruction()
      ;
    }

    return txIx;
  }

  async placeBid(
    bid: number,
    twitter_handle: string,
    bidder: PublicKey
  ): Promise<TransactionInstruction> {
    const {auctionPDA} = await this.getLastAuction();

    const txIxs = await this.program.methods
      .placeBid(new BN(bid), twitter_handle)
      .accounts({
        bidder,
        auction: auctionPDA
      })
      .instruction();

    return txIxs;
  }

  async withdraw(): Promise<TransactionInstruction[]> {
    const auctionsToWitdraw = await this.program.account.auction.all()
    let ixs = []
    for(const acc of auctionsToWitdraw){
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      // This is an aprox, u should take time from Solana instead
      if (currentTimeInSeconds > acc.account.endTime.toNumber() && acc.account.isActive && acc.account.withdrawn == false){
        ixs.push(
          await this.program.methods
          .withdraw()
          .accountsPartial({
            auction: acc.publicKey,
          })
          .instruction()
        )
      }
    }
    
    return ixs;
  }

  async closeAllEscrowAccountsIxs(): Promise<TransactionInstruction[]>{
    const escrowsToClose = await this.program.account.bidEscrow.all()
    const latestAuction = await this.getLastAuction();
    let ixs = [];
    for (const acc of escrowsToClose){
      if(acc.account.indexerCounter.toNumber() != latestAuction.auction.indexerCounter.toNumber() || latestAuction.auction.highestBidder.equals(acc.account.bidder)){
        continue
      }
      const [auctionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(AUCTION_SEEDS), acc.account.indexerCounter.toArrayLike(Buffer, "le", 8)],
        this.program.programId
      );

      ixs.push(await this.program.methods.closeEscrow().accounts({
        auction: auctionPDA,
        bidder: acc.account.bidder
      }).instruction())
    }
    return ixs;
  }


  async closeEscrow(auctionId: number, bidder: PublicKey): Promise<TransactionInstruction> {
    const {auctionPDA} = await this.getAuction(auctionId);
    const ix = await this.program.methods
      .closeEscrow()
      .accounts({
        auction: auctionPDA,
        bidder
      })
      .instruction();
    return ix;
  }

  async getAllAuctions(from?: number): Promise<AipoolAuctionAccount[]> {
    const auctionPDAs: PublicKey[] = [];
    const indexer = await this.getAuctionsIndexer();
    let totalAuctions = indexer;

    let idx = 0;
    if (!from) {
      idx = indexer > 100 ? indexer - 100 : 0;
    } else {
      if (from >= indexer || indexer - from > 100) {
        console.error("Invalid from");
        return [];
      }
      idx = from;
    }

    for (idx; idx < totalAuctions; idx++) {
      const [auctionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(AUCTION_SEEDS),
          new BN(idx + 1).toArrayLike(Buffer, "le", 8),
        ],
        this.program.programId
      );
      auctionPDAs.push(auctionPDA);
    }

    const connection = this.program.provider.connection;
    const accountInfos = await connection.getMultipleAccountsInfo(auctionPDAs);

    const auctions: AipoolAuctionAccount[] = [];
    for (const accountInfo of accountInfos) {
      if (accountInfo) {
        try {
          const auction = this.program.account.auction.coder.accounts.decode(
            "auction",
            accountInfo.data
          );
          auctions.push(auction as AipoolAuctionAccount);
        } catch (error) {
          console.error("Error decoding auction account:", error);
        }
      }
    }
    return auctions.filter((auction) => auction !== null) as AipoolAuctionAccount[];
  }

  async getLastAuction():  Promise<{auction: AipoolAuctionAccount; auctionPDA: PublicKey}> {
    return await this.getAuction();
  }

  parseAuction(accountInfo: AccountInfo<Buffer>): AipoolAuctionAccount{
    return this.program.coder.accounts.decode("auction", accountInfo.data) as AipoolAuctionAccount;

  }

  getAipoolAuctionAccountWithIndexer(indexer:number): PublicKey{
    const [auctionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(AUCTION_SEEDS),
        new BN(indexer).toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );
    return auctionPDA;
  }

  async getAuction(auctionId?: number): Promise<{auction: AipoolAuctionAccount; auctionPDA: PublicKey}> {
    let indexer;
    if (!auctionId) {
      indexer = await this.getAuctionsIndexer();
    } else {
      indexer = auctionId;
    }
    const [auctionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(AUCTION_SEEDS),
        new BN(indexer).toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );

    return {auction: await this.program.account.auction.fetch(auctionPDA),auctionPDA };
  }

  // Fetch AuctionsIndexer account
  async getAuctionsIndexer(): Promise<number> {
    const [auctionsIndexerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(AUCTIONS_INDEXER_SEEDS)],
      this.program.programId
    );

    const indexerAccount = await this.program.account.auctionsIndexer.fetch(
      auctionsIndexerPDA
    );
    return Number(indexerAccount.auctionsCounter);
  }

  // Check if an auction is active
  async isAuctionActive(auctionId: number): Promise<boolean> {
    const {auction} = await this.getAuction(auctionId);
    return auction.isActive;
  }

  async getHighestBidLastAuction(): Promise<number> {
    return await this.getHighestBid();
  }
  // Get the highest bid for an auction
  async getHighestBid(auctionId?: number): Promise<number> {
    let auction: any;
    if (!auctionId) {
      const indexer = await this.getAuctionsIndexer();
      auction = await this.getAuction(indexer);
    } else {
      auction = await this.getAuction(auctionId);
    }
    return auction.highestBid.toNumber(); // Convert from BN
  }

  // Get the highest bidder for an auction
  async getHighestBidder(auctionId: number): Promise<string> {
    const {auction} = await this.getAuction(auctionId);
    return auction.highestBidder.toBase58();
  }

  // Get time remaining in an auction (in seconds)
  async getTimeRemaining(auctionId: number): Promise<number> {
    const {auction} = await this.getAuction(auctionId);
    const currentTime = Math.floor(Date.now() / 1000); // Current UNIX timestamp
    const elapsedTime = currentTime - auction.startTime.toNumber(); // Convert from BN
    const timeRemaining = Math.max(86400 - elapsedTime, 0); // 24 hours in seconds
    return timeRemaining;
  }

  async fetchAllAuctions(): Promise<any[]> {
    try {
      const auctions = await this.program.account.auction.all();

      return auctions.map((auction) => ({
        publicKey: auction.publicKey.toBase58(),
        account: {
          ...auction.account,
          highestBidder: auction.account.highestBidder.toBase58(),
          owner: auction.account.owner.toBase58(),
        },
      }));
    } catch (error) {
      console.error("Error fetching auctions:", error);
      throw error;
    }
  }
}
