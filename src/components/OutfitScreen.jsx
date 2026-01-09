import React from "react";

export default function OutfitScreen() {
  return (
    <div className="sf-stack sf-fade-in" style={{ gap: 16 }}>
      <h2 className="sf-title-lg">Outfit Builder</h2>
      <p className="sf-subtitle">
        Create and save head-to-toe fits. AI recommendations coming soon.
      </p>

      {/* Section: Choose garments for each category */}
      <div className="sf-card">
        <h3 style={{ marginBottom: 6 }}>Your Fit</h3>
        <p className="sf-kicker">Select items for each category</p>

        <div className="sf-stack" style={{ marginTop: 12 }}>
          <div className="sf-card-subtle">
            <strong>Headwear</strong>
            <p className="sf-subtitle">Hat, beanie, bandana…</p>
            {/* TODO: Add dropdown or garment selector */}
          </div>

          <div className="sf-card-subtle">
            <strong>Top</strong>
            <p className="sf-subtitle">Shirt, hoodie, jacket…</p>
            {/* TODO */}
          </div>

          <div className="sf-card-subtle">
            <strong>Bottom</strong>
            <p className="sf-subtitle">Jeans, shorts, joggers…</p>
            {/* TODO */}
          </div>

          <div className="sf-card-subtle">
            <strong>Socks</strong>
            <p className="sf-subtitle">Crew, ankle, no-show…</p>
            {/* TODO */}
          </div>

          <div className="sf-card-subtle">
            <strong>Shoes</strong>
            <p className="sf-subtitle">Sneakers, boots, dress shoes…</p>
            {/* TODO */}
          </div>

          <div className="sf-card-subtle">
            <strong>Accessories</strong>
            <p className="sf-subtitle">Watch, chain, sunglasses…</p>
            {/* TODO */}
          </div>
        </div>
      </div>

      {/* Section: Actions */}
      <div className="sf-row">
        <button className="sf-btn sf-btn-outline" style={{ flex: 1 }}>
          Generate Fit (AI)
          {/* TODO: Hook to AI outfit generator */}
        </button>

        <button className="sf-btn sf-btn-primary" style={{ flex: 1 }}>
          Save Outfit
          {/* TODO: Save to Supabase */}
        </button>
      </div>

      {/* Section: Saved outfits list (placeholder) */}
      <div className="sf-card">
        <h3>Saved Outfits</h3>
        <p className="sf-subtitle">Your saved looks will appear here.</p>
        {/* TODO: Map over outfits from Supabase */}
      </div>
    </div>
  );
}
