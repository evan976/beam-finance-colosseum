pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn");

#[program]
pub mod beam {
    use super::*;

    pub fn close_legacy_treasury(ctx: Context<CloseLegacyTreasury>) -> Result<()> {
        close_legacy_treasury::handler(ctx)
    }

    pub fn close_record(ctx: Context<CloseRecord>) -> Result<()> {
        close_record::handler(ctx)
    }

    pub fn close_treasury(ctx: Context<CloseTreasury>) -> Result<()> {
        close_treasury::handler(ctx)
    }

    pub fn create_treasury(ctx: Context<CreateTreasury>, name: String) -> Result<()> {
        create_treasury::handler(ctx, name)
    }

    pub fn add_employee(
        ctx: Context<AddEmployee>,
        employee: Pubkey,
        name: String,
        department: String,
        position: String,
        base_salary: u64,
    ) -> Result<()> {
        add_employee::handler(ctx, employee, name, department, position, base_salary)
    }

    pub fn remove_employee(ctx: Context<RemoveEmployee>, employee: Pubkey) -> Result<()> {
        remove_employee::handler(ctx, employee)
    }

    pub fn submit_reimbursement(
        ctx: Context<SubmitReimbursement>,
        record_id: u64,
        amount: u64,
        description: String,
    ) -> Result<()> {
        submit_reimbursement::handler(ctx, record_id, amount, description)
    }

    pub fn approve_reimbursement(ctx: Context<ApproveReimbursement>) -> Result<()> {
        approve_reimbursement::handler(ctx)
    }

    pub fn reject_reimbursement(ctx: Context<RejectReimbursement>) -> Result<()> {
        reject_reimbursement::handler(ctx)
    }

    pub fn pay_salary(ctx: Context<PaySalary>, record_id: u64, memo: String) -> Result<()> {
        pay_salary::handler(ctx, record_id, memo)
    }

    pub fn transfer_from_treasury(
        ctx: Context<TransferFromTreasury>,
        record_id: u64,
        amount: u64,
        memo: String,
    ) -> Result<()> {
        transfer_from_treasury::handler(ctx, record_id, amount, memo)
    }

    pub fn transfer_p2p(
        ctx: Context<TransferP2p>,
        record_id: u64,
        amount: u64,
        memo: String,
    ) -> Result<()> {
        transfer_p2p::handler(ctx, record_id, amount, memo)
    }

    pub fn add_contact(
        ctx: Context<AddContact>,
        address: Pubkey,
        name: String,
    ) -> Result<()> {
        add_contact::handler(ctx, address, name)
    }

    pub fn remove_contact(ctx: Context<RemoveContact>, address: Pubkey) -> Result<()> {
        remove_contact::handler(ctx, address)
    }
}
