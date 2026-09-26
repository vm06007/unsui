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
      'Show only in-app SUI orders, largest purchase first.',
      'On Orders, move Recipient and Transaction hash to the first columns and show both.',
      'Show Orders as compact table rows with 25 orders per page.',
    ],
  },
  payouts: {
    label: 'Crypto payouts',
    placeholder: 'Show confirmed SUI payouts, newest first…',
    examples: [
      'On Crypto payouts, show only confirmed in-app SUI payouts, newest first.',
      'On Crypto payouts, show Recipient, Crypto amount, Asset and Transaction hash first.',
      'Switch Crypto payouts to timeline view.',
    ],
  },
  reconciliation: {
    label: 'Reconciliation',
    placeholder: 'Show amount mismatches and unmatched orders…',
    examples: [
      'On Reconciliation, show only amount mismatches and unmatched orders.',
      'On Reconciliation, put Merchant reference, Purchase and Reconciliation first and show them.',
      'On Reconciliation, show all statuses again and sort by newest date.',
    ],
  },
  treasury: {
    label: 'Treasury & forecast',
    placeholder: 'Focus the treasury view on in-app purchases…',
    examples: [
      'Keep Treasury open and filter to in-app purchases only.',
      'Clear the search and date filters on Treasury and include all purchase sources.',
      'Explain how the payout buffer differs from merchant settlement.',
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
