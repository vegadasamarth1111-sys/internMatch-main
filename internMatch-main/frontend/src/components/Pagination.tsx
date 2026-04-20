interface PaginationProps {
  total: number
  limit: number
  offset: number
  onPageChange: (newOffset: number) => void
  loading?: boolean
}

export function Pagination({ total, limit, offset, onPageChange, loading }: PaginationProps) {
  if (total <= limit) return null

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const btnBase = 'px-3 py-1.5 text-sm rounded-lg transition font-medium disabled:opacity-40 disabled:cursor-not-allowed'
  const activeCls = 'bg-blue-600 text-white'
  const inactiveCls = 'border border-gray-300 text-gray-600 hover:bg-gray-50'

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{offset + 1}–{Math.min(offset + limit, total)}</span> of{' '}
        <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(offset - limit)}
          disabled={offset === 0 || loading}
          className={`${btnBase} ${inactiveCls}`}
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange((p - 1) * limit)}
              disabled={loading}
              className={`${btnBase} ${currentPage === p ? activeCls : inactiveCls}`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total || loading}
          className={`${btnBase} ${inactiveCls}`}
        >
          Next →
        </button>
      </div>
    </div>
  )
}