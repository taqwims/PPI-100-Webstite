package handlers

import (
	"net/http"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
)

type PublicHandler struct {
	publicUsecase *usecase.PublicUsecase
}

func NewPublicHandler(publicUsecase *usecase.PublicUsecase) *PublicHandler {
	return &PublicHandler{publicUsecase: publicUsecase}
}

func (h *PublicHandler) GetTeachers(c *gin.Context) {
	teachers, err := h.publicUsecase.GetPublicTeachers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, teachers)
}

func (h *PublicHandler) GetDownloads(c *gin.Context) {
	downloads, err := h.publicUsecase.GetDownloads()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, downloads)
}

func (h *PublicHandler) GetAlumni(c *gin.Context) {
	alumni, err := h.publicUsecase.GetAlumni()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, alumni)
}

func (h *PublicHandler) RegisterPPDB(c *gin.Context) {
	var req domain.PPDBRegistration
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.publicUsecase.RegisterPPDB(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Registration successful"})
}
