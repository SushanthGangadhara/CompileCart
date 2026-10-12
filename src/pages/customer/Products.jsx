import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { ProductStore } from '../../data/storage';
import ProductCard from '../../components/common/ProductCard';

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports', 'Beauty', 'Toys'];
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 200000]);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'featured';

  const allProducts = ProductStore.getAll();

  const filtered = useMemo(() => {
    let p = allProducts;
    if (search) p = p.filter(pr =>
      pr.name.toLowerCase().includes(search.toLowerCase()) ||
      pr.description.toLowerCase().includes(search.toLowerCase()) ||
      pr.category.toLowerCase().includes(search.toLowerCase())
    );
    if (category) p = p.filter(pr => pr.category === category);
    p = p.filter(pr => pr.price >= priceRange[0] && pr.price <= priceRange[1]);
    switch (sort) {
      case 'price-asc':  return [...p].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...p].sort((a, b) => b.price - a.price);
      case 'rating':     return [...p].sort((a, b) => b.rating - a.rating);
      case 'newest':     return [...p].reverse();
      default:           return [...p].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [allProducts, search, category, sort, priceRange]);

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams({});
    setPriceRange([0, 200000]);
  }

  const hasFilters = search || category || sort !== 'featured';

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-layout">
          {/* Sidebar */}
          <aside className={`filters-sidebar ${showFilters ? 'open' : ''}`}>
            <div className="filter-header">
              <h3>Filters</h3>
              <button className="filter-close" onClick={() => setShowFilters(false)}><X size={18} /></button>
            </div>

            <div className="filter-section">
              <h4>Category</h4>
              <div className="filter-options">
                <label className="filter-opt">
                  <input type="radio" name="cat" checked={!category} onChange={() => setParam('category', '')} />
                  <span>All</span>
                </label>
                {CATEGORIES.map(c => (
                  <label key={c} className="filter-opt">
                    <input type="radio" name="cat" checked={category === c} onChange={() => setParam('category', c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Price Range</h4>
              <div className="price-inputs">
                <input type="number" placeholder="Min" value={priceRange[0]}
                  onChange={e => setPriceRange([+e.target.value, priceRange[1]])} className="form-control" />
                <span>–</span>
                <input type="number" placeholder="Max" value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], +e.target.value])} className="form-control" />
              </div>
            </div>

            {hasFilters && (
              <button className="btn btn-outline btn-sm w-full" onClick={clearFilters}>
                <X size={14} /> Clear Filters
              </button>
            )}
          </aside>

          {/* Main */}
          <main className="products-main">
            <div className="products-toolbar">
              <div className="toolbar-left">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(v => !v)}>
                  <SlidersHorizontal size={15} /> Filters
                </button>
                {category && (
                  <span className="active-filter">
                    {category} <button onClick={() => setParam('category', '')}><X size={12} /></button>
                  </span>
                )}
                {search && (
                  <span className="active-filter">
                    "{search}" <button onClick={() => setParam('search', '')}><X size={12} /></button>
                  </span>
                )}
                <span className="result-count">{filtered.length} products</span>
              </div>
              <select className="form-control sort-select" value={sort}
                onChange={e => setParam('sort', e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <Search size={48} color="#d1d5db" />
                <h3>No products found</h3>
                <p>Try adjusting your search or filters</p>
                <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>
              </div>
            ) : (
              <div className="products-grid">
                {filtered.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </main>
        </div>
      </div>
      <style>{`
        .products-page { padding: 2rem 0; flex: 1; }
        .products-layout { display: grid; grid-template-columns: 240px 1fr; gap: 2rem; align-items: start; }
        @media(max-width:768px) { .products-layout { grid-template-columns: 1fr; } }
        .filters-sidebar { background: #fff; border-radius: 14px; padding: 1.25rem; box-shadow: 0 2px 12px rgba(0,0,0,.06); position: sticky; top: 80px; }
        @media(max-width:768px) {
          .filters-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 200; transform: translateX(-100%); transition: transform .3s; border-radius: 0; overflow-y: auto; }
          .filters-sidebar.open { transform: translateX(0); box-shadow: 4px 0 20px rgba(0,0,0,.2); }
        }
        .filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .filter-header h3 { font-size: 1rem; }
        .filter-close { background: none; border: none; cursor: pointer; padding: .25rem; display: flex; }
        .filter-section { margin-bottom: 1.25rem; }
        .filter-section h4 { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: .6rem; }
        .filter-options { display: flex; flex-direction: column; gap: .3rem; }
        .filter-opt { display: flex; align-items: center; gap: .5rem; cursor: pointer; font-size: .875rem; color: #374151; padding: .2rem 0; }
        .filter-opt:hover { color: #6366f1; }
        .price-inputs { display: flex; align-items: center; gap: .5rem; }
        .price-inputs .form-control { width: 90px; font-size: .8rem; padding: .4rem .6rem; }
        .products-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: .75rem; }
        .toolbar-left { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
        .active-filter { display: inline-flex; align-items: center; gap: .3rem; background: #ede9fe; color: #4f46e5; padding: .25rem .6rem; border-radius: 100px; font-size: .8rem; font-weight: 600; }
        .active-filter button { background: none; border: none; cursor: pointer; display: flex; color: #4f46e5; }
        .result-count { font-size: .8rem; color: #6b7280; }
        .sort-select { width: auto; min-width: 180px; font-size: .875rem; padding: .4rem .75rem; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; gap: 1rem; text-align: center; }
        .empty-state h3 { font-size: 1.25rem; }
        .empty-state p { color: #6b7280; }
      `}</style>
    </div>
  );
}
