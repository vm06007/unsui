import {
  CreditCard,
  ScanLine,
  FileCheck,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
export function MoneyCycle() {
  const nodes = [
    {
      x: 380,
      y: 65,
      n: '01',
      title: 'Customer purchase',
      sub: 'Approved channel charges the card',
    },
    {
      x: 660,
      y: 245,
      n: '02',
      title: 'Pay from the buffer',
      sub: 'Sui treasury → customer wallet',
    },
    {
      x: 555,
      y: 495,
      n: '03',
      title: 'Yen settles later',
      sub: 'SBPS → merchant bank account',
    },
    {
      x: 205,
      y: 495,
      n: '04',
      title: 'Convert settled yen',
      sub: 'Separate conversion provider',
    },
    {
      x: 100,
      y: 245,
      n: '05',
      title: 'Refill the treasury',
      sub: 'Acquired crypto → Sui pool',
    },
  ];
  return (
    <div className="cycle-panel">
      <div className="cycle-heading">
        <div>
          <span className="arch-kicker">THE MONEY CYCLE</span>
          <h3>Pay ahead. Settle. Refill. Repeat.</h3>
        </div>
        <span className="planned-badge">SANDBOX PAYMENT FLOW</span>
      </div>
      <div
        className="cycle-scroll"
        tabIndex={0}
        role="region"
        aria-label="Circular money lifecycle diagram. Scroll horizontally on narrow screens."
      >
        <svg
          viewBox="-24 0 808 610"
          role="img"
          aria-labelledby="cycle-title cycle-desc"
        >
          <title id="cycle-title">
            The prefunded payout and settlement cycle
          </title>
          <desc id="cycle-desc">
            A supported merchant purchase charges the card. After verification,
            the existing Sui buffer pays the customer. Yen later settles to the
            merchant bank account. A separate provider converts settled yen into
            crypto, which replenishes the treasury for another purchase.
            Connecting arrows show stages, not one continuous transfer of the
            same asset.
          </desc>
          <defs>
            <marker
              id="cycle-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path
                d="M0 0 L8 4 L0 8"
                fill="none"
                stroke="#7ba260"
                strokeWidth="1.6"
              />
            </marker>
          </defs>
          <circle
            cx="380"
            cy="305"
            r="186"
            fill="#f2f7ed"
            stroke="#e2ecd8"
            strokeDasharray="4 7"
          />
          <g
            fill="none"
            stroke="#7ba260"
            strokeWidth="2"
            markerEnd="url(#cycle-arrow)"
          >
            <path d="M480 75 Q625 90 653 196" />
            <path d="M674 292 Q684 416 617 453" />
            <path d="M447 518 Q380 560 308 519" />
            <path d="M140 453 Q62 407 89 293" />
            <path d="M107 196 Q146 85 277 75" />
          </g>
          <g className="cycle-edge-labels">
            {[
              { label: 'Verify payment', x: 580, y: 109, width: 116 },
              { label: 'Settlement lag', x: 672, y: 382, width: 112 },
              {
                label: 'Net of fees & adjustments',
                x: 380,
                y: 572,
                width: 180,
              },
              { label: 'Crypto deposit', x: 87, y: 382, width: 116 },
              { label: 'Next purchase', x: 173, y: 109, width: 110 },
            ].map(({ label, x, y, width }) => (
              <g key={label} transform={`translate(${x},${y})`}>
                <rect
                  x={-width / 2}
                  y={-14}
                  width={width}
                  height={28}
                  rx={14}
                />
                <text textAnchor="middle" dominantBaseline="central">
                  {label}
                </text>
              </g>
            ))}
          </g>
          <g className="cycle-center">
            <text x="380" y="269" textAnchor="middle">
              TWO CLOCKS.
            </text>
            <text x="380" y="302" textAnchor="middle">
              ONE TREASURY.
            </text>
            <text
              x="380"
              y="341"
              textAnchor="middle"
              className="cycle-center-small"
            >
              Payouts use crypto already funded.
            </text>
            <text
              x="380"
              y="365"
              textAnchor="middle"
              className="cycle-center-small"
            >
              Yen replenishes it afterward.
            </text>
          </g>
          {nodes.map((n) => (
            <g key={n.n} transform={`translate(${n.x},${n.y})`}>
              <rect
                x="-108"
                y="-42"
                width="216"
                height="91"
                rx="15"
                fill={n.n === '02' ? '#173e2f' : '#fff'}
                stroke={n.n === '02' ? '#173e2f' : '#d8e4cb'}
              />
              <text
                y="-20"
                textAnchor="middle"
                className="cycle-number"
                fill={n.n === '02' ? '#c6e6a1' : '#829c68'}
              >
                {n.n}
              </text>
              <text
                y="4"
                textAnchor="middle"
                className="cycle-node-title"
                fill={n.n === '02' ? '#f0f8e7' : '#426334'}
              >
                {n.title}
              </text>
              <text
                y="28"
                textAnchor="middle"
                className="cycle-node-sub"
                fill={n.n === '02' ? '#bad0a8' : '#708561'}
              >
                {n.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="cycle-caption">
        Read clockwise. Arrows connect stages in the lifecycle; yen settlement
        and crypto payouts use separate rails. Operator capital funds the
        initial buffer before the first payout.
      </p>
    </div>
  );
}
export function ChargeSequence() {
  const steps = [
    {
      icon: ScanLine,
      status: 'NFC READ',
      title: 'Scan the card',
      text: 'Read the balance and recent journeys. The shared ledger checks what remains available for refund.',
    },
    {
      icon: CreditCard,
      status: 'YOUR DESTINATION',
      title: 'Review the quote',
      text: 'Choose Sui, Ethereum or Awaji. Resolve a name, enter an address or use the dGen1 wallet, then review the fee and payout.',
    },
    {
      icon: FileCheck,
      status: 'SAME-CARD CHECK',
      title: 'Re-scan to confirm',
      text: 'Present the same card again. The backend validates the request and requires a World ID proof for refunds above ¥1,000.',
    },
    {
      icon: ShieldCheck,
      status: 'ISSUING REFUND',
      title: 'Wait for confirmation',
      text: 'The contract processes the payout while the app shows progress. Safe retries reuse the saved request and transaction.',
    },
    {
      icon: Wallet,
      status: 'CONFIRMED ON-CHAIN',
      title: 'Open your receipt',
      text: 'See the amount, destination and transaction hash. Open the explorer or find the same refund in history and the dashboard.',
    },
  ];
  return (
    <div className="charge-sequence">
      <span className="arch-kicker">ONE REFUND, START TO FINISH</span>
      <h3>From the first scan to the explorer.</h3>
      <ol>
        {steps.map((step, i) => (
          <li key={step.title}>
            <div className="charge-step-icon">
              <step.icon size={21} />
              <span>{i + 1}</span>
            </div>
            <div>
              <span className="charge-status">{step.status}</span>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="charge-boundary">
        <b>Keep the receipt, even if the connection drops.</b> The hosted ledger
        preserves confirmed refunds. Retry an interrupted request to recover its
        result without issuing another payout.
      </div>
    </div>
  );
}

export function ClaimTree() {
  return (
    <div
      className="claim-tree-scroll"
      tabIndex={0}
      role="region"
      aria-label="Merkle tree diagram. Scroll horizontally on narrow screens."
    >
      <svg
        className="claim-tree-svg"
        viewBox="0 0 600 252"
        role="img"
        aria-labelledby="claim-tree-title claim-tree-desc"
      >
        <title id="claim-tree-title">
          Four claim fields connected to one Merkle root
        </title>
        <desc id="claim-tree-desc">
          Card commitment and recipient connect to the left parent hash. JPY
          amount and observed JPY balance connect to the right parent hash. Both
          parent hashes connect to the SHA-256 Merkle root.
        </desc>
        <g fill="none" stroke="#9ab783" strokeWidth="2" strokeLinejoin="round">
          <path d="M300 60 V84 H150 V105 M300 84 H450 V105" />
          <path d="M150 147 V168 H75 V193 M150 168 H225 V193" />
          <path d="M450 147 V168 H375 V193 M450 168 H525 V193" />
        </g>
        <g fill="#9ab783">
          <circle cx="300" cy="84" r="3" />
          <circle cx="150" cy="168" r="3" />
          <circle cx="450" cy="168" r="3" />
        </g>
        <rect
          x="175"
          y="12"
          width="250"
          height="48"
          rx="12"
          fill="#e0eccf"
          stroke="#bed4a5"
        />
        <text x="300" y="42" textAnchor="middle" className="tree-root-text">
          SHA-256 Merkle root
        </text>
        {[150, 450].map((x) => (
          <g key={x}>
            <rect
              x={x - 120}
              y="105"
              width="240"
              height="42"
              rx="10"
              fill="#f0f6e9"
              stroke="#d0dfc3"
            />
            <text x={x} y="131" textAnchor="middle">
              Parent hash
            </text>
          </g>
        ))}
        {[
          { x: 75, a: 'Card', b: 'commitment' },
          { x: 225, a: 'Recipient', b: '' },
          { x: 375, a: 'JPY amount', b: '' },
          { x: 525, a: 'Observed JPY', b: 'balance' },
        ].map((n) => (
          <g key={n.x}>
            <rect
              x={n.x - 69}
              y="193"
              width="138"
              height="52"
              rx="9"
              fill="#fff"
              stroke="#d6e1cc"
            />
            <text x={n.x} y={n.b ? 214 : 224} textAnchor="middle">
              {n.a}
              {n.b && (
                <tspan x={n.x} dy="18">
                  {n.b}
                </tspan>
              )}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
