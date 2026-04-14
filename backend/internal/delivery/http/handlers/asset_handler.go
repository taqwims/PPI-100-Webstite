package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreateAssetRequest struct {
	Name             string  `json:"name" binding:"required"`
	Category         string  `json:"category" binding:"required"`
	Condition        string  `json:"condition" binding:"required"`
	Location         string  `json:"location" binding:"required"`
	AcquisitionValue float64 `json:"acquisition_value" binding:"required"`
	AcquisitionDate  string  `json:"acquisition_date" binding:"required"` // Format: YYYY-MM-DD
	Status           string  `json:"status" binding:"required"`
	Notes            string  `json:"notes"`
}

type AssetHandler struct {
	assetUsecase *usecase.AssetUsecase
}

func NewAssetHandler(assetUsecase *usecase.AssetUsecase) *AssetHandler {
	return &AssetHandler{assetUsecase: assetUsecase}
}

// CreateAsset handles POST /assets
func (h *AssetHandler) CreateAsset(c *gin.Context) {
	var req CreateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	acqDate, err := time.Parse("2006-01-02", req.AcquisitionDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
		return
	}

	asset := &domain.Asset{
		Name:             req.Name,
		Category:         req.Category,
		Condition:        req.Condition,
		Location:         req.Location,
		AcquisitionValue: req.AcquisitionValue,
		AcquisitionDate:  acqDate,
		Status:           req.Status,
		Notes:            req.Notes,
		CreatedByID:      userID,
	}

	if err := h.assetUsecase.CreateAsset(asset); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "Nilai perolehan") || strings.Contains(msg, "Tanggal perolehan") {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Aset berhasil dibuat", "data": asset})
}

// GetAssets handles GET /assets
func (h *AssetHandler) GetAssets(c *gin.Context) {
	kategori := c.Query("kategori")
	kondisi := c.Query("kondisi")
	status := c.Query("status")
	lokasi := c.Query("lokasi")
	keyword := c.Query("keyword")

	assets, err := h.assetUsecase.GetAssets(kategori, kondisi, status, lokasi, keyword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assets)
}

// GetAssetByID handles GET /assets/:id
func (h *AssetHandler) GetAssetByID(c *gin.Context) {
	id := c.Param("id")

	asset, err := h.assetUsecase.GetAssetByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Aset tidak ditemukan"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Aset tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, asset)
}

// UpdateAsset handles PUT /assets/:id
func (h *AssetHandler) UpdateAsset(c *gin.Context) {
	id := c.Param("id")

	assetID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	// Fetch existing asset to preserve fields not in the request
	existing, err := h.assetUsecase.GetAssetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aset tidak ditemukan"})
		return
	}

	var body struct {
		Name             string  `json:"name"`
		Category         string  `json:"category"`
		Condition        string  `json:"condition"`
		Location         string  `json:"location"`
		AcquisitionValue float64 `json:"acquisition_value"`
		AcquisitionDate  string  `json:"acquisition_date"` // Change to string
		Status           string  `json:"status"`
		Notes            string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Apply updates over existing data
	existing.ID = assetID
	if body.Name != "" {
		existing.Name = body.Name
	}
	if body.Category != "" {
		existing.Category = body.Category
	}
	if body.Condition != "" {
		existing.Condition = body.Condition
	}
	if body.Location != "" {
		existing.Location = body.Location
	}
	if body.AcquisitionValue != 0 {
		existing.AcquisitionValue = body.AcquisitionValue
	}
	if body.AcquisitionDate != "" {
		acqDate, err := time.Parse("2006-01-02", body.AcquisitionDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (YYYY-MM-DD)"})
			return
		}
		existing.AcquisitionDate = acqDate
	}
	if body.Status != "" {
		existing.Status = body.Status
	}
	existing.Notes = body.Notes

	if err := h.assetUsecase.UpdateAsset(existing); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "Nilai perolehan") || strings.Contains(msg, "Tanggal perolehan") {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Aset berhasil diperbarui", "data": existing})
}

// DeleteAsset handles DELETE /assets/:id
func (h *AssetHandler) DeleteAsset(c *gin.Context) {
	id := c.Param("id")

	if err := h.assetUsecase.DeleteAsset(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Aset berhasil dihapus"})
}

// GetAssetRecap handles GET /assets/recap
func (h *AssetHandler) GetAssetRecap(c *gin.Context) {
	recap, err := h.assetUsecase.GetAssetRecap()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, recap)
}
