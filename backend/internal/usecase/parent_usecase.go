package usecase

import (
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/pkg/utils"

	"github.com/google/uuid"
)

type ParentUsecase struct {
	parentRepo  *postgres.ParentRepository
	userRepo    *postgres.UserRepository
	studentRepo *postgres.StudentRepository
}

func NewParentUsecase(parentRepo *postgres.ParentRepository, userRepo *postgres.UserRepository, studentRepo *postgres.StudentRepository) *ParentUsecase {
	return &ParentUsecase{parentRepo: parentRepo, userRepo: userRepo, studentRepo: studentRepo}
}

type ParentWithChildren struct {
	domain.Parent
	Children []domain.Student `json:"children"`
}

func (u *ParentUsecase) GetAllParents() ([]ParentWithChildren, error) {
	parents, err := u.parentRepo.GetAll()
	if err != nil {
		return nil, err
	}

	var result []ParentWithChildren
	for _, p := range parents {
		// Fetch children
	// Use GetByParent
		children, err := u.studentRepo.GetByParent(p.ID.String())
		if err != nil {
			children = []domain.Student{}
		}
		result = append(result, ParentWithChildren{
			Parent:   p,
			Children: children,
		})
	}
	return result, nil
}

func (u *ParentUsecase) GetParentByID(id string) (*ParentWithChildren, error) {
	parent, err := u.parentRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	children, err := u.studentRepo.GetByParent(id)
	if err != nil {
		children = []domain.Student{}
	}
	return &ParentWithChildren{
		Parent:   *parent,
		Children: children,
	}, nil
}

func (u *ParentUsecase) CreateParent(name, email, password string, phone, address, occupation, relation string, unitID uint) error {
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return err
	}

	user := &domain.User{
		Name:         name,
		Email:        email,
		PasswordHash: hashedPassword,
		RoleID:       7, // Parent role
		UnitID:       unitID,
	}

	if err := u.userRepo.Create(user); err != nil {
		return err
	}

	parent := &domain.Parent{
		UserID:     user.ID,
		Phone:      phone,
		Address:    address,
		Occupation: occupation,
		Relation:   relation,
	}

	if err := u.parentRepo.Create(parent); err != nil {
		// Rollback user creation
		u.userRepo.Delete(user.ID.String())
		return err
	}

	return nil
}

func (u *ParentUsecase) UpdateParent(id string, name, email, password, phone, address, occupation, relation string) error {
	parent, err := u.parentRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Update User
	user, err := u.userRepo.FindByID(parent.UserID.String())
	if err != nil {
		return err
	}
	user.Name = name
	user.Email = email
	if password != "" {
		hashedPassword, err := utils.HashPassword(password)
		if err == nil {
			user.PasswordHash = hashedPassword
		}
	}
	if err := u.userRepo.Update(user); err != nil {
		return err
	}

	// Update Parent
	parent.Phone = phone
	parent.Address = address
	parent.Occupation = occupation
	parent.Relation = relation
	return u.parentRepo.Update(parent)
}

func (u *ParentUsecase) DeleteParent(id string) error {
	parent, err := u.parentRepo.FindByID(id)
	if err != nil {
		return err
	}
	userID := parent.UserID.String()
	
	// Unassign children
	children, err := u.studentRepo.GetByParent(id)
	if err == nil {
		for _, child := range children {
			child.ParentID = nil
			u.studentRepo.Update(&child)
		}
	}

	err = u.parentRepo.Delete(id)
	if err != nil {
		return err
	}
	return u.userRepo.Delete(userID)
}

func (u *ParentUsecase) AssignChild(parentID string, studentID string) error {
	_, err := uuid.Parse(studentID)
	if err != nil {
		return err
	}
	
	student, err := u.studentRepo.GetByID(studentID)
	if err != nil {
		return err
	}
	
	parentUUID, err := uuid.Parse(parentID)
	if err != nil {
		return err
	}
	
	student.ParentID = &parentUUID
	return u.studentRepo.Update(student)
}

func (u *ParentUsecase) RemoveChild(studentID string) error {
	student, err := u.studentRepo.GetByID(studentID)
	if err != nil {
		return err
	}
	
	student.ParentID = nil
	return u.studentRepo.Update(student)
}
