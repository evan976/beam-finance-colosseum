use anchor_lang::prelude::*;

pub const MAX_EMPLOYEES: usize = 20;
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_MEMO_LEN: usize = 64;
pub const MAX_DESCRIPTION_LEN: usize = 128;
pub const MAX_DEPARTMENT_LEN: usize = 32;
pub const MAX_POSITION_LEN: usize = 32;

#[account]
pub struct Treasury {
    pub admin: Pubkey,
    pub name: String,
    pub employees: Vec<Pubkey>,
    pub token_mint: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Treasury {
    pub const SIZE: usize = 8 // discriminator
        + 32               // admin
        + 4 + MAX_NAME_LEN // name (string prefix + max bytes)
        + 4 + (32 * MAX_EMPLOYEES) // employees vec
        + 32               // token_mint
        + 1                // bump
        + 1;               // vault_bump
}

#[account]
pub struct Employee {
    pub wallet: Pubkey,
    pub treasury: Pubkey,
    pub name: String,
    pub department: String,
    pub position: String,
    pub base_salary: u64,
    pub pending_reimbursement: u64,
    pub bump: u8,
}

impl Employee {
    pub const SIZE: usize = 8 // discriminator
        + 32                   // wallet
        + 32                   // treasury
        + 4 + MAX_NAME_LEN    // name
        + 4 + MAX_DEPARTMENT_LEN // department
        + 4 + MAX_POSITION_LEN // position
        + 8                    // base_salary
        + 8                    // pending_reimbursement
        + 1;                   // bump
}

#[account]
pub struct Payroll {
    pub employee: Pubkey,
    pub amount: u64,
    pub base_salary: u64,
    pub reimbursement_amount: u64,
    pub timestamp: i64,
    pub memo: String,
    pub treasury: Pubkey,
    pub bump: u8,
}

impl Payroll {
    pub const SIZE: usize = 8 // discriminator
        + 32               // employee
        + 8                // amount
        + 8                // base_salary
        + 8                // reimbursement_amount
        + 8                // timestamp
        + 4 + MAX_MEMO_LEN // memo
        + 32               // treasury
        + 1;               // bump
}

#[account]
pub struct Reimbursement {
    pub employee: Pubkey,
    pub amount: u64,
    pub description: String,
    pub status: u8,
    pub approved_by: Option<Pubkey>,
    pub approved_at: Option<i64>,
    pub timestamp: i64,
    pub treasury: Pubkey,
    pub bump: u8,
}

impl Reimbursement {
    pub const PENDING: u8 = 0;
    pub const APPROVED: u8 = 1;
    pub const REJECTED: u8 = 2;

    pub const SIZE: usize = 8 // discriminator
        + 32               // employee
        + 8                // amount
        + 4 + MAX_DESCRIPTION_LEN // description
        + 1                // status
        + 1 + 32           // approved_by option
        + 1 + 8            // approved_at option
        + 8                // timestamp
        + 32               // treasury
        + 1;               // bump
}

#[account]
pub struct Transfer {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub memo: String,
    pub timestamp: i64,
    pub treasury: Pubkey,
    pub transfer_type: u8,
    pub bump: u8,
}

impl Transfer {
    pub const TREASURY_OUT: u8 = 0;
    pub const P2P: u8 = 1;

    pub const SIZE: usize = 8 // discriminator
        + 32               // sender
        + 32               // recipient
        + 8                // amount
        + 4 + MAX_MEMO_LEN // memo
        + 8                // timestamp
        + 32               // treasury
        + 1                // transfer_type
        + 1;               // bump
}

#[account]
pub struct Contact {
    pub owner: Pubkey,
    pub address: Pubkey,
    pub name: String,
    pub bump: u8,
}

impl Contact {
    pub const SIZE: usize = 8 // discriminator
        + 32               // owner
        + 32               // address
        + 4 + MAX_NAME_LEN // name
        + 1;               // bump
}
