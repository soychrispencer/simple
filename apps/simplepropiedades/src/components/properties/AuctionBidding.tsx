'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@simple/ui';
import { useOptionalAuth } from '@simple/auth';
import { AuctionBid } from '@/types/property';
import { placeAuctionBid, getAuctionBids, canUserBid } from '@/app/actions/auctionActions';
import { IconGavel, IconClock, IconTrendingUp } from '@tabler/icons-react';

interface AuctionBiddingProps {
  propertyId: string;
  currentBid?: number;
  minBid?: number;
  endTime?: string;
  onBidPlaced?: (newBid: AuctionBid) => void;
}

export const AuctionBidding: React.FC<AuctionBiddingProps> = ({
  propertyId,
  currentBid = 0,
  minBid = 0,
  endTime,
  onBidPlaced
}) => {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [canBid, setCanBid] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Calcular tiempo restante
  useEffect(() => {
    if (!endTime) return;

    const updateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeLeft('Finalizada');
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [endTime]);

  // Cargar historial de ofertas
  useEffect(() => {
    const loadBids = async () => {
      const auctionBids = await getAuctionBids(propertyId);
      setBids(auctionBids);
    };
    loadBids();
  }, [propertyId]);

  // Verificar si puede ofertar
  useEffect(() => {
    const checkCanBid = async () => {
      if (!userId) {
        setCanBid(false);
        return;
      }
      const result = await canUserBid(propertyId, userId);
      setCanBid(result.canBid);
    };
    checkCanBid();
  }, [propertyId, userId]);

  const handlePlaceBid = async () => {
    if (!userId) {
      alert('Debes iniciar sesión para ofertar');
      return;
    }

    const amount = parseInt(bidAmount.replace(/\./g, '').replace(/\$/g, ''));
    if (!amount || amount < nextMinBid) {
      alert(`La oferta debe ser al menos ${formatCurrency(nextMinBid)}`);
      return;
    }

    setLoading(true);
    try {
      const result = await placeAuctionBid(propertyId, userId, amount);

      if (result.success && result.bid) {
        setBids(prev => [result.bid!, ...prev]);
        setBidAmount('');
        onBidPlaced?.(result.bid!);
      } else {
        alert(result.error || 'Error al realizar la oferta');
      }
    } catch {
      alert('Error al procesar la oferta');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const nextMinBid = Math.max(currentBid + 1000000, minBid ?? 0); // Incremento mínimo de 1M CLP

  return (
    <div className="space-y-6">
      {/* Información de la subasta */}
      <div className="bg-[var(--color-primary-a10)] rounded-lg p-4 border border-[var(--color-primary-a20)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconGavel className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lighttext dark:text-darktext">
              Subasta Activa
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <IconClock className="w-4 h-4" />
            <span className={timeLeft === 'Finalizada' ? 'text-[var(--color-danger)]' : 'text-lighttext/80 dark:text-darktext/80'}>
              {timeLeft}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-lighttext/70 dark:text-darktext/70">Oferta actual:</span>
            <div className="font-bold text-lg text-lighttext dark:text-darktext">
              {formatCurrency(currentBid)}
            </div>
          </div>
          <div>
            <span className="text-lighttext/70 dark:text-darktext/70">Oferta mínima:</span>
            <div className="font-semibold text-primary">
              {formatCurrency(nextMinBid)}
            </div>
          </div>
        </div>
      </div>

      {/* Formulario para ofertar */}
      {canBid && timeLeft !== 'Finalizada' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-lighttext/80 dark:text-darktext/80">
            Tu oferta
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Mínimo ${formatCurrency(nextMinBid)}`}
              className="flex-1 px-3 py-2 border border-border/60 rounded-md bg-lightcard dark:bg-darkcard focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60"
            />
            <Button
              onClick={handlePlaceBid}
              disabled={loading || !bidAmount}
              className="px-6 py-2 bg-primary hover:bg-[var(--color-primary-a90)] text-[var(--color-on-primary)] font-semibold rounded-md"
            >
              {loading ? 'Ofertando...' : 'Ofertar'}
            </Button>
          </div>
        </div>
      )}

      {/* Historial de ofertas */}
      <div className="space-y-3">
        <h4 className="font-semibold text-lighttext dark:text-darktext flex items-center gap-2">
          <IconTrendingUp className="w-4 h-4" />
          Historial de Ofertas ({bids.length})
        </h4>

        <div className="max-h-48 overflow-y-auto space-y-2">
          {bids.length === 0 ? (
            <p className="text-lighttext/70 dark:text-darktext/70 text-sm text-center py-4">
              Aún no hay ofertas en esta subasta
            </p>
          ) : (
            bids.map((bid) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  bid.status === 'active'
                    ? 'bg-[var(--color-success-subtle-bg)] border-[var(--color-success-subtle-border)]'
                    : 'card-surface ring-1 ring-border/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img
                      src={bid.bidder?.avatar_url || '/placeholder-avatar.svg'}
                      alt={bid.bidder?.full_name || 'Usuario'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {bid.bidder?.full_name || 'Usuario Anónimo'}
                    </p>
                    <p className="text-xs text-lighttext/70 dark:text-darktext/70">
                      {new Date(bid.created_at).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(bid.amount)}</p>
                  {bid.status === 'active' && (
                    <span className="text-xs text-[var(--color-success)] font-medium">Oferta actual</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
