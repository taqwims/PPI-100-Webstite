package utils

import "gorm.io/gorm"

// UnitScope enforces filtering by UnitID for multi-tenancy.
// Super Admin (RoleID 1) can bypass this filter.
func UnitScope(unitID uint, roleID uint) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		// If the user is Super Admin (Role ID 1), do not filter by UnitID
		if roleID == 1 {
			return db
		}
		
		// Ensure that the query only returns records for the user's unit
		return db.Where("unit_id = ?", unitID)
	}
}
