import { useState, useEffect } from 'react'
import './App.css'

interface DDay {
  id: string
  title: string
  target_date: string
  category: string
  memo: string
  is_important: boolean
  created_at: string
  updated_at: string
}

interface ApiResponse {
  data: DDay[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

interface ApiError {
  error: string
}


// 백엔드 쓰기 요청(POST/PUT/DELETE)은 API_KEY 가 설정돼 있으면 X-API-Key 헤더를 요구한다.
// 주의: VITE_* 값은 빌드 결과물(브라우저 번들)에 그대로 들어가므로 누구나 볼 수 있다.
// 무작위 스크립트의 쓰기를 막는 약한 장벽일 뿐 사용자 인증이 아니다.
const API_KEY: string | undefined = import.meta.env.VITE_API_KEY

function writeAuthHeaders(): Record<string, string> {
  return API_KEY ? { 'X-API-Key': API_KEY } : {}
}

function App() {
  const [ddays, setDdays] = useState<DDay[]>([])
  const [newDDay, setNewDDay] = useState({
    title: '',
    target_date: '',
    category: '개인',
    memo: '',
    is_important: false
  })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [importantFilter, setImportantFilter] = useState<boolean | null>(null)
  const [sortBy, setSortBy] = useState('target_date')
  const [sortDirection, setSortDirection] = useState('asc')

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

  useEffect(() => {
    fetchDDays(currentPage)
  }, [currentPage, sortBy, sortDirection])
  
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setCurrentPage(1)
      fetchDDays(1)
    }, 500)
    
    return () => clearTimeout(delayedSearch)
  }, [searchTerm, selectedCategory, importantFilter])

  const fetchDDays = async (page: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        orderBy: sortBy,
        direction: sortDirection
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory) params.append('category', selectedCategory)
      if (importantFilter !== null) params.append('isImportant', importantFilter.toString())
      
      const response = await fetch(`${API_BASE}/ddays?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: ApiResponse = await response.json()
      
      setDdays(result.data || [])
      setCurrentPage(result.pagination.page)
      setTotalPages(result.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch D-Days:', error)
      setError('D-Day 목록을 불러오는데 실패했습니다.')
      setDdays([])
    } finally {
      setLoading(false)
    }
  }

  const calculateDaysLeft = (targetDate: string) => {
    const target = new Date(targetDate)
    const today = new Date()
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/ddays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...writeAuthHeaders(),
        },
        body: JSON.stringify(newDDay),
      })
      
      if (!response.ok) {
        const errorData: ApiError = await response.json()
        throw new Error(errorData.error || 'D-Day 생성에 실패했습니다.')
      }
      
      fetchDDays(currentPage)
      setNewDDay({
        title: '',
        target_date: '',
        category: '개인',
        memo: '',
        is_important: false
      })
      setIsFormOpen(false)
    } catch (error) {
      console.error('Failed to create D-Day:', error)
      setError(error instanceof Error ? error.message : 'D-Day 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const deleteDDay = async (id: string) => {
    if (!confirm('정말로 이 D-Day를 삭제하시겠습니까?')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/ddays/${id}`, {
        method: 'DELETE',
        headers: writeAuthHeaders(),
      })
      
      if (!response.ok) {
        const errorData: ApiError = await response.json()
        throw new Error(errorData.error || 'D-Day 삭제에 실패했습니다.')
      }
      
      fetchDDays(currentPage)
    } catch (error) {
      console.error('Failed to delete D-Day:', error)
      setError(error instanceof Error ? error.message : 'D-Day 삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🗓️ D-Day 관리</h1>
        <button 
          className="add-button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          disabled={loading}
        >
          {isFormOpen ? '취소' : '+ 새 D-Day'}
        </button>
      </header>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="filters">
        <input
          type="text"
          placeholder="검색 (제목, 메모)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-filter"
        >
          <option value="">모든 카테고리</option>
          <option value="개인">개인</option>
          <option value="학업">학업</option>
          <option value="업무">업무</option>
          <option value="기타">기타</option>
        </select>
        <select
          value={importantFilter === null ? '' : importantFilter.toString()}
          onChange={(e) => setImportantFilter(
            e.target.value === '' ? null : e.target.value === 'true'
          )}
          className="important-filter"
        >
          <option value="">중요도 전체</option>
          <option value="true">중요</option>
          <option value="false">일반</option>
        </select>
        <select
          value={`${sortBy}-${sortDirection}`}
          onChange={(e) => {
            const [newSortBy, newSortDirection] = e.target.value.split('-')
            setSortBy(newSortBy)
            setSortDirection(newSortDirection)
          }}
          className="sort-select"
        >
          <option value="target_date-asc">날짜 오름차순</option>
          <option value="target_date-desc">날짜 내림차순</option>
          <option value="title-asc">제목 오름차순</option>
          <option value="title-desc">제목 내림차순</option>
          <option value="created_at-desc">최근 생성순</option>
          <option value="is_important-desc">중요도순</option>
        </select>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="dday-form">
          <input
            type="text"
            placeholder="제목"
            value={newDDay.title}
            onChange={(e) => setNewDDay({...newDDay, title: e.target.value})}
            required
          />
          <input
            type="date"
            value={newDDay.target_date}
            onChange={(e) => setNewDDay({...newDDay, target_date: e.target.value})}
            required
          />
          <select
            value={newDDay.category}
            onChange={(e) => setNewDDay({...newDDay, category: e.target.value})}
          >
            <option value="개인">개인</option>
            <option value="학업">학업</option>
            <option value="업무">업무</option>
            <option value="기타">기타</option>
          </select>
          <textarea
            placeholder="메모 (선택사항)"
            value={newDDay.memo}
            onChange={(e) => setNewDDay({...newDDay, memo: e.target.value})}
          />
          <label>
            <input
              type="checkbox"
              checked={newDDay.is_important}
              onChange={(e) => setNewDDay({...newDDay, is_important: e.target.checked})}
            />
            중요 표시
          </label>
          <button type="submit" disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </button>
        </form>
      )}

      <div className="dday-list">
        {loading ? (
          <div className="loading-message">로딩 중...</div>
        ) : ddays.length === 0 ? (
          <p className="empty-message">등록된 D-Day가 없습니다.</p>
        ) : (
          ddays.map((dday) => {
            const daysLeft = calculateDaysLeft(dday.target_date)
            return (
              <div key={dday.id} className={`dday-card ${dday.is_important ? 'important' : ''}`}>
                <div className="dday-header">
                  <h3>{dday.title}</h3>
                  <button 
                    className="delete-button"
                    onClick={() => deleteDDay(dday.id)}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
                <div className="dday-info">
                  <div className="days-left">
                    {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day!' : `D+${Math.abs(daysLeft)}`}
                  </div>
                  <div className="date">{dday.target_date}</div>
                  <div className="category">{dday.category}</div>
                </div>
                {dday.memo && <p className="memo">{dday.memo}</p>}
                <div className="card-footer">
                  <small className="created-at">
                    생성: {new Date(dday.created_at).toLocaleDateString()}
                  </small>
                  {dday.updated_at !== dday.created_at && (
                    <small className="updated-at">
                      수정: {new Date(dday.updated_at).toLocaleDateString()}
                    </small>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || loading}
          >
            처음
          </button>
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            이전
          </button>
          
          <span className="page-info">
            {currentPage} / {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            다음
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || loading}
          >
            마지막
          </button>
        </div>
      )}
    </div>
  )
}

export default App