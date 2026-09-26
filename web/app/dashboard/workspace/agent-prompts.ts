type PagePrompts = { label: string; placeholder: string; examples: string[] };

const prompts: Record<string, PagePrompts> = {
  overview: {
    label: 'Overview',
    placeholder: 'Put payouts and latest journeys first…',
    examples: [
      'On Overview, put recorded payouts and latest journeys first. Make latest journeys wide.',
      'On Overview, show only Recorded payouts, Payout buffer, Payout asset mix and Latest journeys, in that order.',
      'On Overview, show all cards again and put Needs reconciliation and Reconciliation breakdown first.',
    ],
  },
  orders: {
    label: 'Orders',
    placeholder: 'Show in-app SUI orders, largest purchase first…',
    examples: [
      'Switch Orders to card view.',
      'On Orders, move Recipient and Transaction hash to the first columns and show both.',
      'On Orders, use table view and show only Order, Purchase, Asset and Payout columns.',
    ],
  },
  payouts: {
    label: 'Crypto payouts',
    placeholder: 'Show confirmed SUI payouts, newest first…',
    examples: [
      'Switch Crypto payouts to card view.',
      'On Crypto payouts, show Recipient, Crypto amount, Asset and Transaction hash first.',
      'Switch Crypto payouts to timeline view.',
    ],
  },
  reconciliation: {
    label: 'Reconciliation',
    placeholder: 'Switch reconciliation to cards or simplify its columns…',
    examples: [
      'Switch Reconciliation to card view.',
      'On Reconciliation, use table view and show only Order, Purchase, Merchant reference and Reconciliation columns.',
      'On Reconciliation, switch to timeline view and show all statuses.',
    ],
  },
  treasury: {
    label: 'Treasury & forecast',
    placeholder: 'Show balance, runway and buffer forecast only…',
    examples: [
      'On Treasury, show only Available balance, Projected runway and Buffer forecast, in that order. Make Buffer forecast wide.',
      'On Treasury, move Scenario assumptions and Buffer forecast first and make both wide.',
      'On Treasury, show all cards again and put Recorded payouts first.',
    ],
  },
  connections: {
    label: 'Connections',
    placeholder: 'Explain the different dashboard data sources…',
    examples: [
      'Explain the difference between app ledger records, SB sample purchases and indexed blockchain events.',
      'From Connections, open Orders filtered to in-app purchases.',
      'Keep Connections open and increase the text size for readability.',
    ],
  },
};

export function promptsForPage(page: string): PagePrompts {
  return prompts[page] || prompts.overview;
}
