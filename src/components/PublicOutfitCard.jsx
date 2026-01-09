export default function PublicOutfitCard({ outfit }) {
  return (
    <div className="sf-card sf-fade-in">
      <h3>{outfit?.name || "Untitled Fit"}</h3>
      <p className="sf-subtitle">@{outfit?.username || "snapfit_user"}</p>
    </div>
  );
}
