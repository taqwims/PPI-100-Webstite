package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type InfaqTypeHandler struct {
	db *gorm.DB
}

func NewInfaqTypeHandler(db *gorm.DB) *InfaqTypeHandler {
	return &InfaqTypeHandler{db: db}
}

func (h *InfaqTypeHandler) Create(c *gin.Context) {
	var req domain.InfaqType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *InfaqTypeHandler) GetAll(c *gin.Context) {
	var types []domain.InfaqType
	if err := h.db.Order("name asc").Find(&types).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, types)
}

func (h *InfaqTypeHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req domain.InfaqType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = uint(id)
	if err := h.db.Model(&domain.InfaqType{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":        req.Name,
		"description": req.Description,
		"is_active":   req.IsActive,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Jenis infaq berhasil diperbarui"})
}

func (h *InfaqTypeHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.db.Delete(&domain.InfaqType{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Jenis infaq berhasil dihapus"})
}

// ------------------- WA Template Handler -------------------

type WATemplateHandler struct {
	db *gorm.DB
}

func NewWATemplateHandler(db *gorm.DB) *WATemplateHandler {
	return &WATemplateHandler{db: db}
}

func (h *WATemplateHandler) Create(c *gin.Context) {
	var req domain.WATemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *WATemplateHandler) GetAll(c *gin.Context) {
	var templates []domain.WATemplate
	if err := h.db.Order("name asc").Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (h *WATemplateHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req domain.WATemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = uint(id)
	if err := h.db.Model(&domain.WATemplate{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":          req.Name,
		"body_template": req.BodyTemplate,
		"is_default":    req.IsDefault,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Template WA berhasil diperbarui"})
}

func (h *WATemplateHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.db.Delete(&domain.WATemplate{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Template WA berhasil dihapus"})
}
