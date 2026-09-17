package storage

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"ppi-100-sis/internal/config"
)

type StorageService struct {
	cfg        *config.Config
	s3Client   *s3.Client
	isR2Active bool
}

func NewStorageService(cfg *config.Config) *StorageService {
	svc := &StorageService{cfg: cfg}

	if cfg.R2AccountID != "" && cfg.R2AccessKeyID != "" && cfg.R2SecretAccessKey != "" && cfg.R2BucketName != "" {
		endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID)

		r2Cfg, err := awsconfig.LoadDefaultConfig(context.TODO(),
			awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				cfg.R2AccessKeyID,
				cfg.R2SecretAccessKey,
				"",
			)),
			awsconfig.WithRegion("auto"),
		)
		if err == nil {
			svc.s3Client = s3.NewFromConfig(r2Cfg, func(o *s3.Options) {
				o.BaseEndpoint = aws.String(endpoint)
			})
			svc.isR2Active = true
		}
	}

	return svc
}

// UploadFile uploads a multipart file to Cloudflare R2 or falls back to local storage
func (s *StorageService) UploadFile(ctx context.Context, file multipart.File, fileHeader *multipart.FileHeader, folder string) (string, error) {
	ext := filepath.Ext(fileHeader.Filename)
	uniqueName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
	if folder == "" {
		folder = "uploads"
	}
	objectKey := fmt.Sprintf("%s/%s", folder, uniqueName)

	if s.isR2Active && s.s3Client != nil {
		contentType := fileHeader.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(s.cfg.R2BucketName),
			Key:         aws.String(objectKey),
			Body:        file,
			ContentType: aws.String(contentType),
		})
		if err != nil {
			return "", fmt.Errorf("gagal upload ke Cloudflare R2: %w", err)
		}

		// Build public URL
		baseURL := strings.TrimRight(s.cfg.R2PublicURL, "/")
		if baseURL != "" {
			return fmt.Sprintf("%s/%s", baseURL, objectKey), nil
		}
		// If no public URL is specified, construct default R2 endpoint URL
		return fmt.Sprintf("https://%s.r2.cloudflarestorage.com/%s/%s", s.cfg.R2AccountID, s.cfg.R2BucketName, objectKey), nil
	}

	// Fallback to local storage
	localDir := filepath.Join("./uploads", folder)
	if err := os.MkdirAll(localDir, os.ModePerm); err != nil {
		return "", fmt.Errorf("gagal membuat direktori lokal: %w", err)
	}

	dstPath := filepath.Join(localDir, uniqueName)
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", fmt.Errorf("gagal membuat file lokal: %w", err)
	}
	defer dst.Close()

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		// seek might fail if not supported, but file was not read yet
	}

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("gagal menyimpan file lokal: %w", err)
	}

	return fmt.Sprintf("/uploads/%s/%s", folder, uniqueName), nil
}

// IsR2Enabled returns true if Cloudflare R2 is configured and active
func (s *StorageService) IsR2Enabled() bool {
	return s.isR2Active
}
