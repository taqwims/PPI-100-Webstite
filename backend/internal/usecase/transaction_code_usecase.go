package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"sync"
	"time"
)

type globalTxCacheEntry struct {
	data      []postgres.GlobalTransaction
	expiresAt time.Time
}

type TransactionCodeUsecase struct {
	repo  *postgres.TransactionCodeRepository
	mu    sync.Mutex
	cache map[string]*globalTxCacheEntry
}

func NewTransactionCodeUsecase(repo *postgres.TransactionCodeRepository) *TransactionCodeUsecase {
	return &TransactionCodeUsecase{
		repo:  repo,
		cache: make(map[string]*globalTxCacheEntry),
	}
}

func (u *TransactionCodeUsecase) CreateTransactionCode(tc *domain.TransactionCode) error {
	return u.repo.Create(tc)
}

func (u *TransactionCodeUsecase) GetAllTransactionCodes() ([]domain.TransactionCode, error) {
	return u.repo.GetAll()
}

func (u *TransactionCodeUsecase) GetTransactionCodeByID(id uint) (*domain.TransactionCode, error) {
	return u.repo.GetByID(id)
}

func (u *TransactionCodeUsecase) UpdateTransactionCode(tc *domain.TransactionCode) error {
	return u.repo.Update(tc)
}

func (u *TransactionCodeUsecase) DeleteTransactionCode(id uint) error {
	return u.repo.Delete(id)
}

func (u *TransactionCodeUsecase) GetGlobalTransactions(startDate, endDate, category string, codeID uint) ([]postgres.GlobalTransaction, error) {
	cacheKey := fmt.Sprintf("gt:%s:%s:%s:%d", startDate, endDate, category, codeID)

	u.mu.Lock()
	if entry, ok := u.cache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		u.mu.Unlock()
		return entry.data, nil
	}
	u.mu.Unlock()

	results, err := u.repo.GetGlobalTransactions(startDate, endDate, category, codeID)
	if err != nil {
		return nil, err
	}

	u.mu.Lock()
	u.cache[cacheKey] = &globalTxCacheEntry{
		data:      results,
		expiresAt: time.Now().Add(5 * time.Minute),
	}
	u.mu.Unlock()

	return results, nil
}

func (u *TransactionCodeUsecase) InvalidateGlobalTxCache() {
	u.mu.Lock()
	u.cache = make(map[string]*globalTxCacheEntry)
	u.mu.Unlock()
}

