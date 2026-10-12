use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(record_id: u64, amount: u64, memo: String)]
pub struct TransferP2p<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: validated in handler (any valid address)
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    #[account(
        seeds = [TREASURY_SEED, treasury.admin.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = sender,
        associated_token::mint = token_mint,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = sender,
        space = Transfer::SIZE,
        seeds = [
            TRANSFER_SEED,
            treasury.key().as_ref(),
            sender.key().as_ref(),
            &record_id.to_le_bytes(),
        ],
        bump,
    )]
    pub transfer_record: Account<'info, Transfer>,

    #[account(
        constraint = token_mint.key() == treasury.token_mint @ ErrorCode::InvalidTokenMint,
    )]
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<TransferP2p>,
    _record_id: u64,
    amount: u64,
    memo: String,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(memo.len() <= MAX_MEMO_LEN, ErrorCode::MemoTooLong);

    let sender_key = ctx.accounts.sender.key();
    let recipient_key = ctx.accounts.recipient.key();

    require!(sender_key != recipient_key, ErrorCode::CannotTransferToSelf);

    let treasury = &ctx.accounts.treasury;
    require!(
        treasury.employees.contains(&sender_key),
        ErrorCode::EmployeeNotFound
    );

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        amount,
    )?;

    let record = &mut ctx.accounts.transfer_record;
    record.sender = sender_key;
    record.recipient = recipient_key;
    record.amount = amount;
    record.memo = memo;
    record.timestamp = ctx.accounts.clock.unix_timestamp;
    record.treasury = ctx.accounts.treasury.key();
    record.transfer_type = Transfer::P2P;
    record.bump = ctx.bumps.transfer_record;

    msg!(
        "P2P transfer: {} tokens from {} to {}",
        amount,
        sender_key,
        recipient_key
    );
    Ok(())
}
