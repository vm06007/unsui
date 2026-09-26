'use client';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CreditCard,
  History,
  Home,
  ScanLine,
  ShieldCheck,
  TrainFront,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEMO_NETWORKS, type Receipt } from '@/lib/demo-engine';
import { ActivityList, type DemoTrip } from './activity-list';
import { WalletCard } from './wallet-card';

export function WalletView({
  tab,
  balance,
  receipts,
  onTab,
  onScan,
  onRefund,
  onShowProof,
  onSelectTrip,
}: {
  tab: string;
  balance: number;
  receipts: Receipt[];
  onTab: (tab: string) => void;
  onScan: () => void;
  onRefund: () => void;
  onShowProof: (receipt: Receipt) => void;
  onSelectTrip: (trip: DemoTrip) => void;
}) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTab(String(value))}
      className="wallet-tabs"
    >
      <div className="wallet-top">
        <div className="avatar">旅</div>
        <div>
          <span>こんにちは, traveler</span>
          <h2>Your Japan wallet</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Scan your card"
          onClick={onScan}
        >
          <ScanLine size={22} />
        </button>
      </div>
      <div className="app-scroll">
        <TabsContent value="home">
          <div className="balance-block">
            <span>Available to take with you</span>
            <h1>
              ¥{balance.toLocaleString()}
              <small> JPY</small>
            </h1>
            <span className="conversion">
              ≈ {(balance * 0.98 * DEMO_NETWORKS.sui.rate).toFixed(4)} SUI{' '}
              <ArrowUpRight size={13} />
            </span>
          </div>
          <WalletCard balance={balance} />
          <div className="wallet-actions">
            <button onClick={onRefund}>
              <span>
                <ArrowUpRight />
              </span>
              Refund
            </button>
            <button onClick={onScan}>
              <span>
                <ScanLine />
              </span>
              Scan card
            </button>
            <button onClick={() => onTab('receipts')}>
              <span>
                <ShieldCheck />
              </span>
              Receipts
            </button>
          </div>
          <div className="journey-summary">
            <TrainFront size={20} />
            <div>
              <b>A little Tokyo, still with you.</b>
              <span>One card. So many good memories.</span>
            </div>
          </div>
          <div className="subheading">
            <h3>Recent activity</h3>
            <button onClick={() => onTab('history')}>
              See all <ChevronRight size={15} />
            </button>
          </div>
          <ActivityList
            receipts={receipts}
            onShowProof={onShowProof}
            onSelectTrip={onSelectTrip}
          />
        </TabsContent>
        <TabsContent value="history">
          <div className="tab-heading">
            <span>YOUR TRAVEL DIARY</span>
            <h1>Every little journey.</h1>
            <p>Tokyo, one tap at a time.</p>
          </div>
          <div className="history-totals">
            <div>
              <small>Travel & stops</small>
              <b>¥700</b>
            </div>
            <div>
              <small>UnSui refunds</small>
              <b>¥{(1500 - balance).toLocaleString()}</b>
            </div>
          </div>
          <ActivityList
            receipts={receipts}
            all
            onShowProof={onShowProof}
            onSelectTrip={onSelectTrip}
          />
        </TabsContent>
        <TabsContent value="cards">
          <div className="tab-heading">
            <span>YOUR CARDS</span>
            <h1>A pocketful of Japan.</h1>
            <p>Suica · Sample visitor card</p>
          </div>
          <WalletCard balance={balance} />
          <div className="physical-card">
            <img
              src="/welcome-suica.jpg"
              alt="Red Welcome Suica visitor transit card"
            />
            <div>
              <b>Welcome Suica</b>
              <span>For days spent getting a little lost.</span>
            </div>
          </div>
          <dl className="card-details">
            <div>
              <dt>Card identifier</dt>
              <dd>•••• 2026</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>Japanese yen · JPY</dd>
            </div>
            <div>
              <dt>Available balance</dt>
              <dd>¥{balance.toLocaleString()}</dd>
            </div>
          </dl>
          <button className="button dark full" onClick={onScan}>
            <ScanLine size={18} /> Scan card again
          </button>
          <p className="asset-credit">
            Photo:{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Welcome_Suica.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Ravi Dwivedi
            </a>{' '}
            ·{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
          </p>
        </TabsContent>
        <TabsContent value="receipts">
          <div className="tab-heading">
            <span>YOUR REFUNDS</span>
            <h1>A trail you can trust.</h1>
            <p>Each receipt connects to the one before.</p>
          </div>
          {!receipts.length ? (
            <div className="empty-receipts">
              <ShieldCheck size={40} />
              <h3>Your story starts here.</h3>
              <p>
                Try a refund to create your first browser receipt and explore
                its proof.
              </p>
              <button className="button dark" onClick={onRefund}>
                Try a refund <ArrowUpRight size={18} />
              </button>
            </div>
          ) : (
            <div className="receipt-list">
              {[...receipts].reverse().map((receipt) => (
                <button key={receipt.id} onClick={() => onShowProof(receipt)}>
                  <span className="round-check">
                    <Check size={18} />
                  </span>
                  <div>
                    <b>
                      {receipt.amount.toFixed(receipt.chain === 'sui' ? 4 : 6)}{' '}
                      {DEMO_NETWORKS[receipt.chain].asset}
                    </b>
                    <span>
                      Receipt #{receipt.sequence} ·{' '}
                      {new Date(receipt.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          )}
          <div className="proof-explainer">
            <ShieldCheck size={20} />
            <p>
              Browser receipts are computed locally. See the{' '}
              <a href="/#technology">deployed Sui prototype</a> for real mainnet
              records.
            </p>
          </div>
        </TabsContent>
      </div>
      <TabsList className="bottom-nav">
        <TabsTrigger value="home">
          <Home />
          <span>Home</span>
        </TabsTrigger>
        <TabsTrigger value="history">
          <History />
          <span>Activity</span>
        </TabsTrigger>
        <button
          className="center-scan"
          onClick={onScan}
          aria-label="Open scanner"
        >
          <ScanLine />
        </button>
        <TabsTrigger value="cards">
          <CreditCard />
          <span>Cards</span>
        </TabsTrigger>
        <TabsTrigger value="receipts">
          <ShieldCheck />
          <span>Receipts</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
