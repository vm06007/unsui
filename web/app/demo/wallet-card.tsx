'use client';
import { Wifi } from 'lucide-react';

export function WalletCard({ balance }: { balance: number }) {
  return (
    <div className="wallet-card demo-card">
      <div>
        <span>TRANSIT · JAPAN</span>
        <strong>Suica</strong>
      </div>
      <div className="card-route">
        <span>東京</span>
        <div />
        <span>次へ</span>
      </div>
      <div className="card-bottom">
        <span>
          Available balance
          <br />
          <b>¥{balance.toLocaleString()}</b>
        </span>
        <span>
          •••• 2026 <Wifi size={18} />
        </span>
      </div>
    </div>
  );
}
