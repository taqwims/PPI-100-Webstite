package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

type TeacherUsecase struct {
	teacherRepo *postgres.TeacherRepository
}

func NewTeacherUsecase(teacherRepo *postgres.TeacherRepository) *TeacherUsecase {
	return &TeacherUsecase{teacherRepo: teacherRepo}
}

func (u *TeacherUsecase) GetAllTeachers(unitID uint) ([]domain.Teacher, error) {
	return u.teacherRepo.GetAll(unitID)
}
