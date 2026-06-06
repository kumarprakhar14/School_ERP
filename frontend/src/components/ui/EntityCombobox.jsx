import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * EntityCombobox
 * 
 * A reusable, searchable combobox to replace native <select> elements
 * for large datasets (like students, staff, etc.).
 * 
 * @param {Array} options - The array of objects to select from
 * @param {String|Number} value - The currently selected option's id/value
 * @param {Function} onChange - Callback when an option is selected: (value) => void
 * @param {Function} getDisplayValue - Function to get the string to show in the closed button: (option) => string
 * @param {Function} filterFn - Function to filter the options based on search query: (options, query) => array
 * @param {Function} renderItem - Function to render the rich UI for an option in the list: (option) => JSX
 * @param {String} placeholder - Text when nothing is selected
 * @param {String} searchPlaceholder - Text for the search input
 * @param {Boolean} disabled - Whether the combobox is disabled
 */
export default function EntityCombobox({ 
  options = [], 
  value, 
  onChange,
  getDisplayValue,
  filterFn,
  renderItem,
  placeholder = "Select an option...", 
  searchPlaceholder = "Search...",
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  // Close when clicking outside the component
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on the search query
  const filteredOptions = filterFn ? filterFn(options, query) : options;

  // Find the currently selected option object
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Trigger Button */}
      <div 
        className={`w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white flex justify-between items-center transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
        <span className={`truncate ${selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
          {selectedOption ? getDisplayValue(selectedOption) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-50 flex items-center bg-gray-50/50">
            <Search className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            <input 
              type="text" 
              className="w-full pl-2 pr-4 py-1.5 bg-transparent border-none text-sm focus:ring-0 outline-none text-gray-900 placeholder:text-gray-400" 
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = value === option.id;
                return (
                  <div 
                    key={option.id}
                    className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <div className="flex-1">
                      {renderItem ? renderItem(option, isSelected) : (
                        <span className="text-sm font-medium text-gray-900">{getDisplayValue(option)}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
