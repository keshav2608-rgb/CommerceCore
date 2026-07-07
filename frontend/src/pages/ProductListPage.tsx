import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts, setSearch, setPriceRange, setPage } from "../features/catalog/catalogSlice";
import { useDebounce } from "../hooks/useDebounce";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";

export default function ProductListPage() {
  const dispatch = useAppDispatch();
  const { items, page, limit, total, search, minPrice, maxPrice, status, error } = useAppSelector(
    (state) => state.catalog
  );

  const debouncedSearch = useDebounce(search, 400);
  const debouncedMinPrice = useDebounce(minPrice, 400);
  const debouncedMaxPrice = useDebounce(maxPrice, 400);

  useEffect(() => {
    dispatch(
      fetchProducts({
        search: debouncedSearch,
        minPrice: debouncedMinPrice ? Number(debouncedMinPrice) : undefined,
        maxPrice: debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined,
        page,
        limit,
      })
    );
  }, [dispatch, debouncedSearch, debouncedMinPrice, debouncedMaxPrice, page, limit]);

  return (
    <div className="page product-list-page">
      <h1>Browse products</h1>

      <SearchBar
        search={search}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onSearchChange={(value) => dispatch(setSearch(value))}
        onPriceChange={(min, max) => dispatch(setPriceRange({ minPrice: min, maxPrice: max }))}
      />

      {status === "loading" && <p>Loading products…</p>}
      {status === "failed" && <p className="error-text">{error}</p>}

      {status !== "loading" && items.length === 0 && <p>No products match your search.</p>}

      <div className="product-grid">
        {items.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      <Pagination page={page} limit={limit} total={total} onPageChange={(p) => dispatch(setPage(p))} />
    </div>
  );
}
