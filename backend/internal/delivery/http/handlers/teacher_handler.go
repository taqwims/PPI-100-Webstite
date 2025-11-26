package handlers

import (
	"net/http"
	"ppi-100-sis/internal/usecase"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TeacherHandler struct {
	teacherUsecase *usecase.TeacherUsecase
}

func NewTeacherHandler(teacherUsecase *usecase.TeacherUsecase) *TeacherHandler {
	return &TeacherHandler{teacherUsecase: teacherUsecase}
}

func (h *TeacherHandler) GetAllTeachers(c *gin.Context) {
	unitID, _ := strconv.Atoi(c.Query("unit_id"))
	teachers, err := h.teacherUsecase.GetAllTeachers(uint(unitID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, teachers)
}
