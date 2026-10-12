use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(record_id: u64, amount: u64, memo: String)]
pub struct TransferFromTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump = treasury.bump,
        has_one = admin @ ErrorCode::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = treasury,
        seeds = [VAULT_SEED, treasury.key().as_ref()],
        bump = treasury.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: arbitrary recipient
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        space = Transfer::SIZE,
        seeds = [
            TRANSFER_SEED,
            treasury.key().as_ref(),
            recipient.key().as_ref(),
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
    ctx: Context<TransferFromTreasury>,
    _record_id: u64,
    amount: u64,
    memo: String,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(memo.len() <= MAX_MEMO_LEN, ErrorCode::MemoTooLong);

    let vault_balance = ctx.accounts.vault.amount;
    require!(vault_balance >= amount, ErrorCode::InsufficientFunds);

    let admin_key = ctx.accounts.treasury.admin;
    let treasury_seeds: &[&[u8]] = &[
        TREASURY_SEED,
        admin_key.as_ref(),
        &[ctx.accounts.treasury.bump],
    ];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.treasury.to_account_info(),
            },
            &[treasury_seeds],
        ),
        amount,
    )?;

    let record = &mut ctx.accounts.transfer_record;
    record.sender = ctx.accounts.treasury.key();
    record.recipient = ctx.accounts.recipient.key();
    record.amount = amount;
    record.memo = memo;
    record.timestamp = ctx.accounts.clock.unix_timestamp;
    record.treasury = ctx.accounts.treasury.key();
    record.transfer_type = Transfer::TREASURY_OUT;
    record.bump = ctx.bumps.transfer_record;

    msg!(
        "Treasury transfer: {} tokens to {}",
        amount,
        record.recipient
    );
    Ok(())
}
