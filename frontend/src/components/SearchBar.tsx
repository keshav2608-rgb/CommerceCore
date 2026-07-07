interface SearchBarProps {
  search: string;
  minPrice: string;
  maxPrice: string;
  onSearchChange: (value: string) => void;
  onPriceChange: (minPrice: string, maxPrice: string) => void;
}

export default function SearchBar({
  search,
  minPrice,
  maxPrice,
  onSearchChange,
  onPriceChange,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search products…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-bar__input"
      />
      <input
        type="number"
        placeholder="Min price"
        value={minPrice}
        onChange={(e) => onPriceChange(e.target.value, maxPrice)}
        className="search-bar__price-input"
        min={0}
      />
      <input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => onPriceChange(minPrice, e.target.value)}
        className="search-bar__price-input"
        min={0}
      />
    </div>
  );
}
