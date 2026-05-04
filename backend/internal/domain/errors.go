package domain

import "errors"

// Sentinel errors untuk domain layer.
// Gunakan errors.Is() untuk membandingkan error di handler layer.
var (
	ErrNotFound   = errors.New("resource not found")
	ErrValidation = errors.New("validation error")
	ErrForbidden  = errors.New("forbidden")
	ErrConflict   = errors.New("resource already exists")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrExistingPayment   = errors.New("tidak bisa menghapus data yang sudah memiliki riwayat pembayaran")
	ErrInsufficientBalance = errors.New("saldo tidak mencukupi")
)
