export type LandingChain = 'solana' | 'evm'

export type LandingCopy = {
  heroBadge: string
  heroDescription: string
  featuresSubtitle: string
  howStep1Description: string
  securityOnChainDescription: string
  trustBuiltLabel: string
  trustFeeLabel: string
  footerChain: { href: string; label: string }
}

export function getLandingCopy(chain: LandingChain): LandingCopy {
  if (chain === 'evm') {
    return {
      heroBadge: 'Built on EDU Chain Testnet · Powered by AI',
      heroDescription:
        'Manage payroll, reimbursements, and transfers through natural language. Every operation is recorded on EDU Chain Testnet — transparent, auditable, and verifiable.',
      featuresSubtitle:
        'A complete financial toolkit powered by smart contracts and AI. Replace your fragmented finance stack with one unified platform.',
      howStep1Description:
        'Connect your wallet and create a treasury in one transaction. Fund it with your ERC-20 token to get started.',
      securityOnChainDescription:
        'Every transaction is publicly verifiable on EDU Chain Testnet. No hidden books.',
      trustBuiltLabel: 'Built on EDU Chain Testnet',
      trustFeeLabel: 'Gas on testnet',
      footerChain: {
        href: 'https://opencampus.xyz',
        label: 'EDU Chain',
      },
    }
  }

  return {
    heroBadge: 'Built on Solana · Powered by AI',
    heroDescription:
      'Manage payroll, reimbursements, and transfers through natural language. Every operation is recorded on Solana — transparent, auditable, and low-cost.',
    featuresSubtitle:
      'A complete financial toolkit powered by Solana smart contracts and AI. Replace your fragmented finance stack with one unified platform.',
    howStep1Description:
      'Connect your wallet and create a treasury in one transaction. Fund it with SOL to get started.',
    securityOnChainDescription:
      'Every transaction is publicly verifiable on the Solana blockchain. No hidden books.',
    trustBuiltLabel: 'Built on Solana',
    trustFeeLabel: '< $0.001 per Transaction',
    footerChain: {
      href: 'https://solana.com',
      label: 'Solana',
    },
  }
}
