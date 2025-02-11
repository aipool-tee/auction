#![allow(unexpected_cfgs)]

use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, msg, system_instruction};
use anchor_spl::token::Token;

declare_id!("Auctn5jG7vS8SAH1LWvyKF1vWJbMFzXeMJjBQGdiWUZu");

const ADMIN: &str = "26jWitfbhcoSekDwQVffowob6Qe4cHZRgxEgEN66xqE7";
const RECIPIENT: &str = "EvkcRXSPZactUN5dEHpWXtxnQrZR1NbtFrVGufF3Svr1";

const AUCTIONS_INDEXER_SEEDS: &str = "auctions_indexer";
const AUCTION_SEEDS: &str = "auction";
const BID_ESCROW_SEEDS: &str = "bid";

const MAX_TIME_AUCTION_VALID: i64 = 86400;
const MIN_BID_INCREASE: u64 = 1_000_000_000;

#[program]
mod aipool_auction {

    use super::*;

    #[access_control(enforce_admin(ctx.accounts.admin.key))]
    pub fn initialize_index(ctx: Context<InitializeIndexer>) -> Result<()> {
        let indexer = &mut ctx.accounts.auctions_indexer;
        indexer.bump = ctx.bumps.auctions_indexer;
        indexer.auctions_counter = 0;

        Ok(())
    }

    #[access_control(enforce_admin(ctx.accounts.admin.key))]
    pub fn start_auction(ctx: Context<StartAuction>) -> Result<()> {
        let indexer = &mut ctx.accounts.auctions_indexer;

        if indexer.auctions_counter > 0 {
            let last_auction = ctx
                .accounts
                .previous_auction
                .as_ref()
                .ok_or(AuctionError::MissingAuction)?;
            require!(last_auction.is_expired(), AuctionError::OngoingAuction);
        }

        indexer.auctions_counter += 1;

        let auction = &mut ctx.accounts.auction;
        auction.bump = ctx.bumps.auction;
        auction.owner = ctx.accounts.admin.key();
        auction.is_active = true;
        auction.withdrawn = false;
        auction.indexer_counter = indexer.auctions_counter;
        auction.start_time = Clock::get().unwrap().unix_timestamp;
        auction.end_time = auction.start_time + MAX_TIME_AUCTION_VALID;
        Ok(())
    }

    pub fn place_bid(ctx: Context<PlaceBid>, bid: u64, twitter_handle: String) -> Result<()> {
        let auction = &mut ctx.accounts.auction;

        require!(auction.is_active, AuctionError::AuctionNotActive);
        require!(!auction.is_expired(), AuctionError::AuctionExpired);
        require!(
            bid >= auction.highest_bid + MIN_BID_INCREASE,
            AuctionError::BidTooLow
        );

        let allowed_twitter_chars = |c: char| -> bool { c.is_ascii_alphanumeric() || c == '_' };
        require!(
            twitter_handle.len() <= 15 && twitter_handle.chars().all(allowed_twitter_chars),
            AuctionError::InvalidTwitter
        );

        // TRANSFER FROM BIDDER
        // if there was a previous bid, discount that from the transfer
        let amount_to_transfer = bid - ctx.accounts.bid_escrow.amount;
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.bidder.key(),
            &ctx.accounts.bid_escrow.key(),
            amount_to_transfer,
        );
        solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.bidder.to_account_info(),
                ctx.accounts.bid_escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        ctx.accounts.bid_escrow.amount = bid;
        ctx.accounts.bid_escrow.bidder = ctx.accounts.bidder.key();
        ctx.accounts.bid_escrow.indexer_counter = auction.indexer_counter;
        ctx.accounts.bid_escrow.bump = ctx.bumps.bid_escrow;

        auction.highest_bid = bid;
        auction.highest_bidder = ctx.accounts.bidder.key();
        auction.twitter_handle.fill(0);
        let handle_bytes = twitter_handle.as_bytes();
        auction.twitter_handle[..handle_bytes.len()].copy_from_slice(handle_bytes);

        Ok(())
    }

    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        transfer_from_pda(
            &ctx.accounts.bid_escrow.to_account_info(),
            &ctx.accounts.bidder.to_account_info(),
            ctx.accounts.bid_escrow.amount,
        )
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        require!(auction.is_expired(), AuctionError::AuctionNotExpired);
        require!(
            auction.withdrawn == false,
            AuctionError::AuctionWithdrawnAlready
        );
        auction.is_active = false;
        auction.withdrawn = true;

        let amount = auction.highest_bid;
        transfer_from_pda(
            &ctx.accounts.bid_escrow.to_account_info(),
            &ctx.accounts.recipient,
            amount,
        )?;

        Ok(())
    }
}

fn enforce_admin(key: &Pubkey) -> Result<()> {
    #[cfg(not(feature = "test"))]
    require!(
        *key == Pubkey::from_str(ADMIN).unwrap(),
        AuctionError::Unauthorized
    );
    Ok(())
}

fn transfer_from_pda(source: &AccountInfo, destination: &AccountInfo, lamports: u64) -> Result<()> {
    let rent = Rent::get()?;
    let rent_exempt_minimum = rent.minimum_balance(source.data_len()); 

    require!(
        **source.lamports.borrow() >= lamports + rent_exempt_minimum,
        AuctionError::InsufficientFunds
    );

    **source.lamports.borrow_mut() -= lamports;
    **destination.lamports.borrow_mut() += lamports;
    msg!(
        "Transfer {} lamports from {} to {}",
        lamports,
        source.key(),
        destination.key()
    );
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeIndexer<'info> {
    #[account(
       init,
       payer = admin,
       space = AuctionsIndexer::LEN,
       seeds = [AUCTIONS_INDEXER_SEEDS.as_bytes()],
       bump
   )]
    pub auctions_indexer: Account<'info, AuctionsIndexer>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartAuction<'info> {
    #[account(
        mut,
        seeds = [AUCTIONS_INDEXER_SEEDS.as_bytes()],
        bump = auctions_indexer.bump
    )]
    pub auctions_indexer: Account<'info, AuctionsIndexer>,
    #[account(
        init,
        payer = admin,
        space = Auction::LEN,
        seeds = [AUCTION_SEEDS.as_bytes(), &(auctions_indexer.auctions_counter + 1).to_le_bytes()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    #[account(
        seeds = [AUCTION_SEEDS.as_bytes(), &auctions_indexer.auctions_counter.to_le_bytes()],
        bump = previous_auction.bump
    )]
    pub previous_auction: Option<Account<'info, Auction>>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(
        init_if_needed,
        payer = bidder,
        space = BidEscrow::LEN,
        seeds = [BID_ESCROW_SEEDS.as_bytes(), auction.key().as_ref(), bidder.key.as_ref()],
        bump
    )]
    pub bid_escrow: Account<'info, BidEscrow>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        close = bidder,
        seeds = [BID_ESCROW_SEEDS.as_bytes(), auction.key().as_ref(), bidder.key.as_ref()],
        bump = bid_escrow.bump
    )]
    pub bid_escrow: Account<'info, BidEscrow>,
    #[account(
        mut,
        constraint = bidder.key != &auction.highest_bidder @ AuctionError::InvalidBidder
    )]
    /// CHECK: in pda seeds
    pub bidder: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        seeds = [BID_ESCROW_SEEDS.as_bytes(), auction.key().as_ref(), auction.highest_bidder.as_ref()],
        bump = bid_escrow.bump,
        close = recipient
    )]
    pub bid_escrow: Account<'info, BidEscrow>,
    #[account(
        mut,
        address = Pubkey::from_str(RECIPIENT).unwrap() @ AuctionError::UnauthorizedRecipient
    )]
    /// CHECK:
    pub recipient: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct AuctionsIndexer {
    pub bump: u8,
    pub auctions_counter: u64,
}

impl AuctionsIndexer {
    const LEN: usize = 8 + 1 + 8;
}

#[account]
pub struct Auction {
    pub bump: u8,                 // 1
    pub indexer_counter: u64,     // 8
    pub twitter_handle: [u8; 15], // 15
    pub highest_bid: u64,         // 8 bytes
    pub highest_bidder: Pubkey,   // 32 bytes
    pub owner: Pubkey,            // 32 bytes
    pub is_active: bool,          // 1 byte
    pub withdrawn: bool,          // 1 byte
    pub start_time: i64,          // 8 bytes
    pub end_time: i64,            // 8 bytes
    pub padding: [u8; 48],
}

impl Auction {
    const LEN: usize = 8 + 1 + 8 + 15 + 8 + 32 + 32 + 1 + 1 + 8 + 8 + 48;

    fn is_expired(&self) -> bool {
        Clock::get().unwrap().unix_timestamp > self.end_time
    }
}

#[account]
pub struct BidEscrow {
    pub bump: u8,
    pub amount: u64,
    pub bidder: Pubkey,
    pub indexer_counter: u64,
    pub padding: [u8; 48],
}

impl BidEscrow {
    const LEN: usize = 8 + 1 + 8 + 32 + 8 + 48;
}

#[error_code]
pub enum AuctionError {
    #[msg("Bid is too low")]
    BidTooLow,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Auction is expired")]
    AuctionExpired,
    #[msg("Auction not expired")]
    AuctionNotExpired,
    #[msg("Auction withdraw already exectued")]
    AuctionWithdrawnAlready,
    #[msg("Last auction has not been completed yet")]
    OngoingAuction,
    #[msg("Auction is not active")]
    AuctionNotActive,
    #[msg("Auction has not ended")]
    AuctionNotEnded,
    #[msg("Unauthorized recipient")]
    UnauthorizedRecipient,
    #[msg("Invalid size")]
    InvalidSize,
    #[msg("Invalid best bidder")]
    InvalidBidder,
    #[msg("Invalid twitter")]
    InvalidTwitter,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Previous bidder different")]
    PreviousBidder,
    #[msg("Missing auction")]
    MissingAuction,
}
