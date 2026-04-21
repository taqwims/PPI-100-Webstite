package usecase

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
)

type BackupUsecase struct {
	repo *postgres.BackupRepository
}

func NewBackupUsecase(repo *postgres.BackupRepository) *BackupUsecase {
	return &BackupUsecase{repo: repo}
}

// findPgBinary searches for a PostgreSQL binary (pg_dump, pg_restore) in common locations
func findPgBinary(name string) (string, error) {
	// Try PATH first
	if path, err := exec.LookPath(name); err == nil {
		return path, nil
	}

	// Common locations by OS
	var searchPaths []string
	if runtime.GOOS == "darwin" {
		// macOS Homebrew locations
		searchPaths = []string{
			"/opt/homebrew/bin",
			"/usr/local/bin",
		}
		// Search versioned Homebrew Cellar paths
		cellarDirs := []string{
			"/opt/homebrew/Cellar/postgresql@14",
			"/opt/homebrew/Cellar/postgresql@15",
			"/opt/homebrew/Cellar/postgresql@16",
			"/opt/homebrew/Cellar/postgresql@17",
			"/opt/homebrew/Cellar/postgresql",
			"/usr/local/Cellar/postgresql@14",
			"/usr/local/Cellar/postgresql@15",
			"/usr/local/Cellar/postgresql@16",
			"/usr/local/Cellar/postgresql",
		}
		for _, cellar := range cellarDirs {
			if entries, err := os.ReadDir(cellar); err == nil {
				for _, e := range entries {
					if e.IsDir() {
						searchPaths = append(searchPaths, filepath.Join(cellar, e.Name(), "bin"))
					}
				}
			}
		}
		// Postgres.app
		searchPaths = append(searchPaths,
			"/Applications/Postgres.app/Contents/Versions/latest/bin",
			"/Applications/Postgres.app/Contents/Versions/14/bin",
			"/Applications/Postgres.app/Contents/Versions/15/bin",
			"/Applications/Postgres.app/Contents/Versions/16/bin",
		)
	} else {
		// Linux common paths
		searchPaths = []string{
			"/usr/bin",
			"/usr/lib/postgresql/14/bin",
			"/usr/lib/postgresql/15/bin",
			"/usr/lib/postgresql/16/bin",
		}
	}

	for _, dir := range searchPaths {
		candidate := filepath.Join(dir, name)
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("%s not found in PATH or common locations. Install PostgreSQL client tools or set PATH", name)
}

// findDockerBinary locates the docker executable
func findDockerBinary() (string, error) {
	if path, err := exec.LookPath("docker"); err == nil {
		return path, nil
	}
	// Common locations
	for _, p := range []string{"/opt/homebrew/bin/docker", "/usr/local/bin/docker", "/usr/bin/docker"} {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}
	return "", fmt.Errorf("docker not found in PATH or common locations")
}

// getBackupDir returns the configured backup directory, creating it if needed
func getBackupDir(cfg *config.Config) (string, error) {
	dir := cfg.BackupDir
	if dir == "" {
		dir = "./backups"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create backup directory: %w", err)
	}
	return dir, nil
}

// CreateBackup runs pg_dump and saves the backup file + record.
// If DBDockerContainer is configured, it uses 'docker exec' to run pg_dump
// inside the container (avoids pg_dump version mismatch).
func (u *BackupUsecase) CreateBackup(label, notes string, userID uuid.UUID, cfg *config.Config) (*domain.DatabaseBackup, error) {
	backupDir, err := getBackupDir(cfg)
	if err != nil {
		return nil, err
	}

	// Generate filename with timestamp
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("backup_%s.sql", timestamp)
	filePath := filepath.Join(backupDir, filename)

	if cfg.DBDockerContainer != "" {
		// ── Docker exec mode: run pg_dump inside the Postgres container ──
		err = u.dumpViaDocker(cfg, filePath)
	} else {
		// ── Local mode: run pg_dump on the host ──
		err = u.dumpLocal(cfg, filePath)
	}
	if err != nil {
		return nil, err
	}

	// Get file size
	fileInfo, err := os.Stat(filePath)
	var fileSize int64
	if err == nil {
		fileSize = fileInfo.Size()
	}

	// Save backup record
	backup := &domain.DatabaseBackup{
		Filename:      filename,
		FileSizeBytes: fileSize,
		Label:         label,
		Notes:         notes,
		Status:        "Success",
		CreatedByID:   userID,
	}

	if err := u.repo.Create(backup); err != nil {
		return nil, fmt.Errorf("backup file created but failed to save record: %w", err)
	}

	return backup, nil
}

// dumpLocal runs pg_dump directly on the host machine
func (u *BackupUsecase) dumpLocal(cfg *config.Config, filePath string) error {
	pgDumpPath, err := findPgBinary("pg_dump")
	if err != nil {
		return err
	}

	pgDumpArgs := []string{
		"-h", cfg.DBHost,
		"-p", cfg.DBPort,
		"-U", cfg.DBUser,
		"-d", cfg.DBName,
		"-F", "c",
		"-f", filePath,
	}

	cmd := exec.Command(pgDumpPath, pgDumpArgs...)
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", cfg.DBPassword))

	output, err := cmd.CombinedOutput()
	if err != nil {
		errMsg := strings.TrimSpace(string(output))
		return fmt.Errorf("pg_dump failed: %s — %w", errMsg, err)
	}
	return nil
}

// dumpViaDocker runs pg_dump inside the Docker container and pipes output to local file
func (u *BackupUsecase) dumpViaDocker(cfg *config.Config, filePath string) error {
	dockerPath, err := findDockerBinary()
	if err != nil {
		return err
	}

	// Run pg_dump inside the container, output to stdout, write to local file
	// Inside the container, Postgres is on localhost:5432 (internal port)
	args := []string{
		"exec",
		"-e", fmt.Sprintf("PGPASSWORD=%s", cfg.DBPassword),
		cfg.DBDockerContainer,
		"pg_dump",
		"-h", "localhost",
		"-U", cfg.DBUser,
		"-d", cfg.DBName,
		"-F", "c",
	}

	cmd := exec.Command(dockerPath, args...)

	// Create output file
	outFile, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create backup file: %w", err)
	}
	defer outFile.Close()

	cmd.Stdout = outFile

	// Capture stderr for error messages
	var stderrBuf strings.Builder
	cmd.Stderr = &stderrBuf

	if err := cmd.Run(); err != nil {
		// Clean up failed file
		os.Remove(filePath)
		errMsg := strings.TrimSpace(stderrBuf.String())
		return fmt.Errorf("pg_dump (docker) failed: %s — %w", errMsg, err)
	}

	return nil
}

// ListBackups returns all backups ordered by time (for timeline)
func (u *BackupUsecase) ListBackups() ([]domain.DatabaseBackup, error) {
	return u.repo.GetAll()
}

// RestoreBackup restores the database from a backup file
func (u *BackupUsecase) RestoreBackup(id uuid.UUID, cfg *config.Config) error {
	backup, err := u.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("backup not found: %w", err)
	}

	backupDir, err := getBackupDir(cfg)
	if err != nil {
		return err
	}
	filePath := filepath.Join(backupDir, backup.Filename)

	// Check file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("backup file not found: %s", backup.Filename)
	}

	// Update status to Restoring
	u.repo.UpdateStatus(id, "Restoring")

	if cfg.DBDockerContainer != "" {
		err = u.restoreViaDocker(cfg, filePath)
	} else {
		err = u.restoreLocal(cfg, filePath)
	}

	if err != nil {
		u.repo.UpdateStatus(id, "Failed")
		return err
	}

	// Mark as restored
	u.repo.MarkRestored(id)
	return nil
}

// restoreLocal runs pg_restore directly on the host machine
func (u *BackupUsecase) restoreLocal(cfg *config.Config, filePath string) error {
	pgRestorePath, err := findPgBinary("pg_restore")
	if err != nil {
		return err
	}

	pgRestoreArgs := []string{
		"-h", cfg.DBHost,
		"-p", cfg.DBPort,
		"-U", cfg.DBUser,
		"-d", cfg.DBName,
		"--clean",
		"--if-exists",
		filePath,
	}

	cmd := exec.Command(pgRestorePath, pgRestoreArgs...)
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", cfg.DBPassword))

	output, err := cmd.CombinedOutput()
	if err != nil {
		errMsg := strings.TrimSpace(string(output))
		return fmt.Errorf("pg_restore failed: %s — %w", errMsg, err)
	}
	return nil
}

// restoreViaDocker runs pg_restore inside the Docker container, piping the local file via stdin
func (u *BackupUsecase) restoreViaDocker(cfg *config.Config, filePath string) error {
	dockerPath, err := findDockerBinary()
	if err != nil {
		return err
	}

	// Open the backup file to pipe into docker exec
	inFile, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open backup file: %w", err)
	}
	defer inFile.Close()

	args := []string{
		"exec", "-i",
		"-e", fmt.Sprintf("PGPASSWORD=%s", cfg.DBPassword),
		cfg.DBDockerContainer,
		"pg_restore",
		"-h", "localhost",
		"-U", cfg.DBUser,
		"-d", cfg.DBName,
		"--clean",
		"--if-exists",
	}

	cmd := exec.Command(dockerPath, args...)
	cmd.Stdin = inFile

	var stderrBuf strings.Builder
	cmd.Stderr = &stderrBuf

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderrBuf.String())
		// pg_restore often exits with warnings even on success; check if it's a real error
		if !strings.Contains(errMsg, "WARNING") || strings.Contains(errMsg, "FATAL") || strings.Contains(errMsg, "could not connect") {
			return fmt.Errorf("pg_restore (docker) failed: %s — %w", errMsg, err)
		}
	}

	return nil
}

// GetBackupFilePath returns the file path for download
func (u *BackupUsecase) GetBackupFilePath(id uuid.UUID, cfg *config.Config) (string, string, error) {
	backup, err := u.repo.GetByID(id)
	if err != nil {
		return "", "", fmt.Errorf("backup not found: %w", err)
	}

	backupDir, err := getBackupDir(cfg)
	if err != nil {
		return "", "", err
	}
	filePath := filepath.Join(backupDir, backup.Filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", "", fmt.Errorf("backup file not found: %s", backup.Filename)
	}

	return filePath, backup.Filename, nil
}

// DeleteBackup removes the backup file and record
func (u *BackupUsecase) DeleteBackup(id uuid.UUID, cfg *config.Config) error {
	backup, err := u.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("backup not found: %w", err)
	}

	backupDir, err := getBackupDir(cfg)
	if err != nil {
		return err
	}
	filePath := filepath.Join(backupDir, backup.Filename)

	// Delete file (ignore error if file doesn't exist)
	os.Remove(filePath)

	// Delete record
	return u.repo.Delete(id)
}
