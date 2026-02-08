import React from 'react';
import { Search, Filter } from 'lucide-react';

const FilterBar = ({ searchTerm, setSearchTerm, category, setCategory, categories, inputRef }) => {
    return (
        <div className="filter-bar">
            <div className="search-container">
                <Search className="search-icon" size={20} />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search tools... (Ctrl + K)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="category-select">
                <Filter className="search-icon" size={20} />
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FilterBar;
