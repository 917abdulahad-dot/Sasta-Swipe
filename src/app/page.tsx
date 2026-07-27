"use client";

import { useState, useEffect } from "react";
import { BANKS, CITIES } from "@/lib/banks";
import { ScrapeResult, Discount } from "@/types";

type LoadingStep = "idle" | "scraping" | "parsing" | "done";

type SavedCard = {
  id: number;
  bank_id: string;
  card_type: string;
  custom_name: string | null;
};

export default function HomePage() {
  const [bankId, setBankId] = useState("");
  const [cardType, setCardType] = useState("");
  const [city, setCity] = useState("");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [savedCardsList, setSavedCardsList] = useState<SavedCard[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Modal States
  const [selectedDeal, setSelectedDeal] = useState<Discount | null>(null);
  const [modalCap, setModalCap] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<string>("");

  const selectedBank = bankId ? BANKS.find((b) => b.id === bankId) : undefined;
  const isLoading = loadingStep === "scraping" || loadingStep === "parsing";

  // Load preferences on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setIsLoggedIn(true);
          if (data.preferences) {
            if (data.preferences.bank_id) setBankId(data.preferences.bank_id);
            if (data.preferences.card_type) setCardType(data.preferences.card_type);
          }
          // Also fetch saved cards
          fetch("/api/user/saved-cards")
            .then(res => res.json())
            .then(d => {
              if (d.cards) setSavedCardsList(d.cards);
            })
            .catch(console.error);
        }
        setInitialLoadDone(true);
      })
      .catch(() => setInitialLoadDone(true));
  }, []);

  // Auto-save preferences when they change
  useEffect(() => {
    if (isLoggedIn && initialLoadDone) {
      fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId, cardType }),
      }).catch(console.error);
    }
  }, [bankId, cardType, isLoggedIn, initialLoadDone]);

  async function handleSaveCard() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    const bankName = BANKS.find(b => b.id === bankId)?.name || bankId;
    const customName = `${bankName} - ${cardType}`;
    
    try {
      const res = await fetch("/api/user/saved-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId, cardType, customName })
      });
      const data = await res.json();
      if (res.ok) {
        setSavedCardsList([{ id: data.id, bank_id: bankId, card_type: cardType, custom_name: customName }, ...savedCardsList]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteSavedCard(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/user/saved-cards?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedCardsList(savedCardsList.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!bankId || !cardType || !city) {
      setError("Please select a bank, card, and city first.");
      return;
    }
    
    setError(null);
    setResult(null);
    setLoadingStep("scraping");
    setPage(1);
    setHasMore(true);

    // Fake step transition after a moment for UX
    const parsingTimer = setTimeout(() => {
      if (loadingStep !== "done") setLoadingStep("parsing");
    }, 8000);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId, cardType, city, page: 1, searchQuery }),
      });

      clearTimeout(parsingTimer);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }

      const data: ScrapeResult = await res.json();
      setResult(data);
      if (data.discounts.length === 0) setHasMore(false);
      setLoadingStep("done");
    } catch (err) {
      clearTimeout(parsingTimer);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setLoadingStep("idle");
    }
  }

  async function handleLoadMore() {
    if (!result || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId, cardType, city, page: nextPage, searchQuery }),
      });

      if (!res.ok) {
        throw new Error("Failed to load more deals");
      }

      const data: ScrapeResult = await res.json();
      
      if (data.discounts.length === 0) {
        setHasMore(false);
      } else {
        setResult({
          ...result,
          discounts: [...result.discounts, ...data.discounts]
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleCardClick(deal: Discount) {
    setSelectedDeal(deal);
    setModalCap(null);
    setOriginalPrice("");
    setModalLoading(true);

    try {
      // If "All Cards" is selected, Peekaboo requires a specific card to show the terms.
      // We default to the first actual card in the bank's list (index 1).
      const resolvedCardType = cardType === "All Cards" ? (selectedBank?.cardTypes[1] || "All Cards") : cardType;

      const res = await fetch("/api/deal-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bankId: selectedBank?.id,
          entityId: deal.entityId, 
          merchant: deal.merchant, 
          cardType: resolvedCardType, 
          city 
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setModalCap(data.maxCap);
      }
    } catch (err) {
      console.error("Failed to fetch cap:", err);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            Stop Hunting.<br />
            <span className="gradient-text">Just Eat &amp; Save.</span>
          </h1>
          <p className="hero-subtitle">
            Enter your bank and card type to instantly discover all food &amp; dining
            discounts available to you — no more visiting ten different websites.
          </p>

          {/* ── Saved Cards List ── */}
          {isLoggedIn && savedCardsList.length > 0 && (
            <div className="saved-cards-container">
              <span className="saved-cards-label">My Saved Cards:</span>
              <div className="saved-cards-list">
                {savedCardsList.map(c => (
                  <button 
                    key={c.id} 
                    type="button"
                    className="saved-card-pill"
                    onClick={() => {
                      setBankId(c.bank_id);
                      setCardType(c.card_type);
                      setResult(null);
                    }}
                  >
                    {c.custom_name || `${c.bank_id} - ${c.card_type}`}
                    <span 
                      className="saved-card-delete" 
                      onClick={(e) => handleDeleteSavedCard(c.id, e)}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Search Form ── */}
          <form onSubmit={handleSearch} className="search-card">
            <div className="search-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="bank-select">Bank</label>
                <select
                  id="bank-select"
                  className="form-select"
                  value={bankId}
                  onChange={(e) => {
                    setBankId(e.target.value);
                    setCardType("");
                    setResult(null);
                  }}
                >
                  <option value="" disabled>Select Bank</option>
                  {BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="card-select">Card Type</label>
                <select
                  id="card-select"
                  className="form-select"
                  value={cardType}
                  onChange={(e) => { setCardType(e.target.value); setResult(null); }}
                  disabled={!bankId}
                >
                  <option value="" disabled>Select Card</option>
                  {selectedBank?.cardTypes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="city-select">City</label>
                <select
                  id="city-select"
                  className="form-select"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setResult(null); }}
                >
                  <option value="" disabled>Select City</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="restaurant-search">Search Restaurant (Optional)</label>
              <input
                id="restaurant-search"
                className="form-input"
                type="text"
                placeholder="e.g. Kababjees"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setResult(null); }}
              />
            </div>

            <div className="form-actions">
              <button
                id="search-submit"
                type="submit"
                className="search-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    {loadingStep === "scraping" ? "Scraping website…" : "AI is parsing…"}
                  </>
                ) : (
                  <>
                    Find Dining Deals
                  </>
                )}
              </button>
              
              <button 
                type="button" 
                className="save-card-btn" 
                onClick={handleSaveCard}
              >
                ⭐ Save this Card
              </button>
            </div>
          </form>

          {/* ── Stats ── */}
          {!result && !isLoading && (
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-value">{BANKS.length}</span>
                <div className="stat-label">Banks supported</div>
              </div>
              <div className="stat-item">
                <span className="stat-value">AI</span>
                <div className="stat-label">Powered parsing</div>
              </div>
              <div className="stat-item">
                <span className="stat-value">Real-time</span>
                <div className="stat-label">Live scraping</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Loading State ── */}
      {isLoading && (
        <section className="results-section">
          <div className="container">
            <div className="loading-status">
              <div className="loading-status-title">
                Finding your dining deals…
              </div>
              <div className="loading-status-sub">
                This takes ~15-30 seconds — we&apos;re visiting the bank&apos;s website live.
              </div>
              <div className="loading-steps">
                <div className={`loading-step ${loadingStep === "scraping" ? "active" : "done"}`}>
                  <span className="step-dot" />
                  Launching browser &amp; visiting {selectedBank?.name}&apos;s website
                </div>
                <div className={`loading-step ${loadingStep === "parsing" ? "active" : ""}`}>
                  <span className="step-dot" />
                  Clicking &quot;See More&quot; &amp; expanding all offers
                </div>
                <div className={`loading-step ${loadingStep === "parsing" ? "active" : ""}`}>
                  <span className="step-dot" />
                  Gemini AI reading page &amp; extracting dining deals
                </div>
              </div>
            </div>

            {/* Skeleton cards */}
            <div className="skeleton-grid">
              {[...Array(6)].map((_, i) => (
                <div className="skeleton-card" key={i}>
                  <div className="skeleton-line wide" />
                  <div className="skeleton-line medium" style={{ marginTop: 16 }} />
                  <div className="skeleton-line full" style={{ marginTop: 20 }} />
                  <div className="skeleton-line full" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Error ── */}
      {error && (
        <section className="results-section">
          <div className="container">
            <div className="error-banner">
              <span className="error-banner-icon">⚠️</span>
              <div>
                <strong>Something went wrong:</strong> {error}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Results ── */}
      {result && !isLoading && (
        <section className="results-section">
          <div className="container">
            <div className="results-header">
              <div>
                <h2 className="results-title">
                  {selectedBank?.name} Dining Deals · {city}
                </h2>
                <div className="results-meta">
                  <span>{cardType}</span>
                  <span className="dot" />
                  <span>Food &amp; Dining only</span>
                  {result.cached && (
                    <>
                      <span className="dot" />
                      <span className="cached-badge">⚡ cached</span>
                    </>
                  )}
                </div>
              </div>
              <span className="results-count">
                {result.discounts.length} deal{result.discounts.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {result.discounts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🍽️</div>
                <div className="empty-title">No dining deals found</div>
                <div className="empty-subtitle">
                  No food or dining offers were found for {cardType} in {city}.<br />
                  Try &quot;All Cards&quot; or check the bank&apos;s website directly.
                </div>
              </div>
            ) : (
              <>
                <div className="cards-grid" id="results-grid">
                  {result.discounts.map((deal, i) => (
                    <DiscountCard 
                      key={i} 
                      deal={deal} 
                      index={i} 
                      onClick={() => handleCardClick(deal)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: 40, marginBottom: 40 }}>
                    <button 
                      className="search-btn" 
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      style={{ padding: "12px 24px", width: "auto", display: "inline-flex" }}
                    >
                      {isLoadingMore ? (
                        <><span className="spinner" /> Loading more...</>
                      ) : (
                        "See More Deals"
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Modal ── */}
      {selectedDeal && (
        <CalculatorModal 
          deal={selectedDeal} 
          maxCap={modalCap} 
          loading={modalLoading} 
          originalPrice={originalPrice}
          setOriginalPrice={setOriginalPrice}
          onClose={() => setSelectedDeal(null)} 
        />
      )}
    </>
  );
}

function DiscountCard({ deal, index, onClick }: { deal: Discount; index: number; onClick: () => void }) {
  const cleanDiscount = deal.discount.replace(/up\s*to\s*/i, "").trim();

  return (
    <article
      className="discount-card clickable"
      style={{ animationDelay: `${index * 0.05}s` }}
      id={`deal-card-${index}`}
      onClick={onClick}
    >
      <div className="card-header">
        <h3 className="card-merchant">{deal.merchant}</h3>
        <span className="card-discount-badge">{cleanDiscount}</span>
      </div>

      <div className="card-divider" />

      <div className="card-meta">
        {deal.location && (
          <div className="card-meta-item">
            <span className="card-meta-icon">📍</span>
            <div>
              <span className="card-meta-label">Location</span>
              {deal.location}
            </div>
          </div>
        )}
        {deal.cardType && (
          <div className="card-meta-item">
            <span className="card-meta-icon">💳</span>
            <div>
              <span className="card-meta-label">Card</span>
              {deal.cardType}
            </div>
          </div>
        )}
        {deal.validity && (
          <div className="card-meta-item">
            <span className="card-meta-icon">📅</span>
            <div>
              <span className="card-meta-label">Valid</span>
              {deal.validity}
            </div>
          </div>
        )}
      </div>

      {deal.terms && (
        <div className="card-terms">
          📋 {deal.terms}
        </div>
      )}
    </article>
  );
}

function CalculatorModal({ 
  deal, 
  maxCap, 
  loading, 
  originalPrice, 
  setOriginalPrice, 
  onClose 
}: { 
  deal: Discount; 
  maxCap: number | null; 
  loading: boolean; 
  originalPrice: string; 
  setOriginalPrice: (val: string) => void; 
  onClose: () => void; 
}) {
  // Try to parse discount percentage from deal.discount (e.g. "Up to 40% off" -> 40)
  const pctMatch = deal.discount.match(/(\d+)%/);
  const discountPct = pctMatch ? parseInt(pctMatch[1], 10) : 0;

  const bill = parseFloat(originalPrice) || 0;
  
  // 1. Discount is applied to original price
  let discountAmount = bill * (discountPct / 100);
  
  // 2. Cap logic
  let capped = false;
  if (maxCap && discountAmount > maxCap) {
    discountAmount = maxCap;
    capped = true;
  }

  // 3. Tax is 8% on original amount
  const taxAmount = bill * 0.08;

  // 4. Final price
  const finalPrice = bill - discountAmount + taxAmount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <h2 className="modal-title">{deal.merchant}</h2>
        <div className="modal-subtitle">{deal.discount} {deal.cardType && `· ${deal.cardType}`}</div>
        
        <div className="calculator-group">
          <label className="calculator-label">Original Bill Amount (PKR)</label>
          <input 
            type="number" 
            className="calculator-input" 
            placeholder="e.g. 5000"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            autoFocus
          />
        </div>

        <div className="receipt">
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              <span className="spinner" style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle", borderColor: "var(--text-muted)", borderTopColor: "transparent" }}></span>
              Loading...
            </div>
          ) : (
            <>
              <div className="receipt-row">
                <span>Original Bill</span>
                <span>Rs. {bill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div className="receipt-row discount-row">
                <span>
                  Discount ({discountPct}%)
                  {capped && <span className="cap-badge">CAPPED</span>}
                </span>
                <span>- Rs. {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {maxCap && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -8, marginBottom: 12, marginLeft: 2 }}>
                  Max cap: Rs. {maxCap.toLocaleString()}
                </div>
              )}

              <div className="receipt-row">
                <span>Tax (8%)</span>
                <span>+ Rs. {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="receipt-row total">
                <span>Final Amount</span>
                <span>Rs. {finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
        </div>

        {deal.terms && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 24, textAlign: "center" }}>
            * {deal.terms}
          </div>
        )}
      </div>
    </div>
  );
}
