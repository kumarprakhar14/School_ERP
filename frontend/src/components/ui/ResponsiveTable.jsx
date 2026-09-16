import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';

/**
 * ResponsiveTable
 * 
 * A reusable table component that automatically handles:
 * - Desktop: Standard Table layout
 * - Tablet: Standard Table but with a sticky first column
 * - Mobile: Card-based layout (via renderMobileCard)
 * 
 * @param {Array} data - Array of records to display.
 * @param {Array} columns - Array of column definitions: { header: String, key?: String, align?: 'left'|'center'|'right', render: Function(item) }
 * @param {Function} renderMobileCard - Function that takes an item and returns JSX for the mobile card view.
 * @param {Function} keyExtractor - Function that takes an item and returns a unique key string/number.
 * @param {String} emptyMessage - Text to show when data is empty.
 * @param {React.Component} emptyIcon - Icon component to render when data is empty (e.g. from lucide-react).
 * @param {Boolean} hasMore - Whether there are more items to load via pagination.
 * @param {Function} onLoadMore - Function to call when scrolling to the bottom.
 */
export default function ResponsiveTable({
  data = [],
  columns = [],
  renderMobileCard,
  keyExtractor,
  emptyMessage = 'No records found.',
  emptyIcon: EmptyIcon,
  onRowClick,
  hasMore = false,
  onLoadMore = () => {}
}) {
  return (
    <InfiniteScroll
      dataLength={data.length}
      next={onLoadMore}
      hasMore={hasMore}
      loader={
        <div className="p-4 mt-2 text-center text-sm font-medium text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
          Loading more records...
        </div>
      }
      style={{ overflow: 'visible' }}
    >
      {/* Desktop / Tablet View (Hidden on Mobile) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {columns.map((col, idx) => {
                  const isSticky = idx === 0;
                  const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                  const stickyClasses = isSticky ? 'sticky left-0 z-10 bg-gray-50/50 border-r border-gray-100' : '';
                  return (
                    <th key={col.key || idx} className={`p-4 ${alignClass} ${stickyClasses}`}>
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((item, rowIndex) => (
                <tr 
                  key={keyExtractor(item)} 
                  className={`hover:bg-gray-50/30 transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((col, idx) => {
                    const isSticky = idx === 0;
                    const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                    // The first column is sticky. It must have a solid background (bg-white) 
                    // and inherit the row's hover state (group-hover:bg-gray-50) so it blends perfectly.
                    const stickyClasses = isSticky ? 'sticky left-0 z-10 bg-white group-hover:bg-gray-50/30 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)]' : '';
                    
                    return (
                      <td key={col.key || idx} className={`p-4 ${alignClass} ${stickyClasses}`}>
                        {col.render(item)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      {EmptyIcon && <EmptyIcon className="w-10 h-10 text-gray-300 mb-3" />}
                      <p className="text-gray-500">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View (Hidden on Desktop/Tablet) */}
      <div className="grid md:hidden grid-cols-1 gap-4">
        {data.length > 0 ? (
          data.map((item) => (
            <div 
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {renderMobileCard ? renderMobileCard(item) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
                  {columns.map((col, idx) => (
                    <div key={col.key || idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                      <span className="text-xs text-gray-500 font-medium mb-1 sm:mb-0">{col.header}</span>
                      <div className="text-sm text-gray-900">{col.render(item)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center flex flex-col items-center justify-center">
            {EmptyIcon && <EmptyIcon className="w-10 h-10 text-gray-300 mb-3" />}
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    </InfiniteScroll>
  );
}
