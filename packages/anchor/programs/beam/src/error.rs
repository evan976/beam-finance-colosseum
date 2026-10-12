use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("This employee has already been added")]
    EmployeeAlreadyExists,

    #[msg("Employee not found in the treasury")]
    EmployeeNotFound,

    #[msg("Maximum number of employees reached")]
    MaxEmployeesReached,

    #[msg("Insufficient funds in treasury vault")]
    InsufficientFunds,

    #[msg("Invalid reimbursement status for this operation")]
    InvalidReimbursementStatus,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Name exceeds maximum length")]
    NameTooLong,

    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,

    #[msg("Memo exceeds maximum length")]
    MemoTooLong,

    #[msg("Recipient is not an employee of this treasury")]
    RecipientNotEmployee,

    #[msg("Cannot transfer to yourself")]
    CannotTransferToSelf,

    #[msg("Invalid token mint for this treasury")]
    InvalidTokenMint,

    #[msg("Department name exceeds maximum length")]
    DepartmentTooLong,

    #[msg("Position name exceeds maximum length")]
    PositionTooLong,

    #[msg("Wallet is not whitelisted to create a treasury")]
    NotWhitelistedAdmin,
}
