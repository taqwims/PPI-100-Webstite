package postgres

import (
	"ppi-100-sis/internal/domain"

	"gorm.io/gorm"
)

type StudentRepository struct {
	db *gorm.DB
}

func NewStudentRepository(db *gorm.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(student *domain.Student) error {
	return r.db.Create(student).Error
}

func (r *StudentRepository) GetAll(unitID uint) ([]domain.Student, error) {
	var students []domain.Student
	query := r.db.Joins("User").Where("\"User\".deleted_at IS NULL")
	if unitID > 0 {
		query = query.Where("students.unit_id = ?", unitID)
	}
	err := query.Preload("User").Preload("Class").Preload("Parent").Preload("Parent.User").
		Find(&students).Error
	return students, err
}

func (r *StudentRepository) GetByID(id string) (*domain.Student, error) {
	var student domain.Student
	err := r.db.Where("id = ?", id).Preload("User").Preload("Class").Preload("Parent").Preload("Parent.User").First(&student).Error
	return &student, err
}

func (r *StudentRepository) GetByParent(parentID string) ([]domain.Student, error) {
	var students []domain.Student
	err := r.db.Where("parent_id = ?", parentID).Preload("User").Preload("Class").Find(&students).Error
	return students, err
}

func (r *StudentRepository) Update(student *domain.Student) error {
	return r.db.Save(student).Error
}

// UpdateClassAndStatus performs a targeted update on only class_id and status columns.
// This avoids issues with GORM's Save() conflicting with preloaded associations.
func (r *StudentRepository) UpdateClassAndStatus(studentID string, classID uint, status string) error {
	return r.db.Model(&domain.Student{}).
		Where("id = ?", studentID).
		Updates(map[string]interface{}{
			"class_id": classID,
			"status":   status,
		}).Error
}

func (r *StudentRepository) Delete(id string) error {
	return r.db.Delete(&domain.Student{}, "id = ?", id).Error
}

func (r *StudentRepository) GetParentByID(parentID string) (*domain.Parent, error) {
	var parent domain.Parent
	err := r.db.Where("id = ?", parentID).First(&parent).Error
	return &parent, err
}

func (r *StudentRepository) PromoteStudentAtomically(studentID string, nextClassID uint, status string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var activeYear domain.AcademicYear
		if err := tx.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
			// If no active year, just skip inserting history and update directly
			return tx.Model(&domain.Student{}).
				Where("id = ?", studentID).
				Updates(map[string]interface{}{
					"class_id": nextClassID,
					"status":   status,
				}).Error
		}

		var student domain.Student
		if err := tx.Where("id = ?", studentID).First(&student).Error; err != nil {
			return err
		}

		// Prevent duplicate history for the same year and class
		var existingHistory domain.StudentClassHistory
		err := tx.Where("student_id = ? AND academic_year_id = ? AND class_id = ?", student.ID, activeYear.ID, student.ClassID).First(&existingHistory).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}

		if err == gorm.ErrRecordNotFound {
			// Insert history
			history := domain.StudentClassHistory{
				StudentID:      student.ID,
				ClassID:        student.ClassID, // Record the OLD class
				AcademicYearID: activeYear.ID,
			}
			if err := tx.Create(&history).Error; err != nil {
				return err
			}
		}

		// Update student
		updateData := map[string]interface{}{
			"status": status,
		}
		if nextClassID > 0 {
			updateData["class_id"] = nextClassID
		}

		if err := tx.Model(&domain.Student{}).Where("id = ?", studentID).Updates(updateData).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *StudentRepository) DeleteByUserID(userID string) error {
	return r.db.Where("user_id = ?", userID).Delete(&domain.Student{}).Error
}
