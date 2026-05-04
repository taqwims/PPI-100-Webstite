package domain

import (
	"time"

	"github.com/google/uuid"
	)

// ------------------- Bulk User Import -------------------
type BulkUserImportRow struct {
	Name     string `json:"name" csv:"name"`
	Email    string `json:"email" csv:"email"`
	Password string `json:"password" csv:"password"`
	RoleID   uint   `json:"role_id" csv:"role_id"`
	UnitID   uint   `json:"unit_id" csv:"unit_id"`
	NISN     string `json:"nisn" csv:"nisn"`
	ClassID  *uint  `json:"class_id" csv:"class_id"`
}

type BulkImportResult struct {
	TotalRows int                  `json:"total_rows"`
	Success   int                  `json:"success"`
	Failed    int                  `json:"failed"`
	Errors    []BulkImportRowError `json:"errors"`
}

type BulkImportRowError struct {
	Row    int    `json:"row"`
	Email  string `json:"email"`
	Reason string `json:"reason"`
}

// ------------------- Database Backup (Timeline) -------------------
type DatabaseBackup struct {
	ID            uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Filename      string     `gorm:"not null" json:"filename"`
	FileSizeBytes int64      `json:"file_size_bytes"`
	Label         string     `json:"label"`       // User label: "Sebelum Migrasi"
	Notes         string     `json:"notes"`       // Extra notes
	Status        string     `gorm:"default:'Success'" json:"status"` // Success, Failed, Restoring
	CreatedByID   uuid.UUID  `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy     User       `gorm:"foreignKey:CreatedByID" json:"created_by"`
	RestoredAt    *time.Time `json:"restored_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

