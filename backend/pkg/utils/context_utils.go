package utils

import "github.com/gin-gonic/gin"

// EnforceUnitID takes the requested Unit ID and ensures it matches the user's
// actual Unit ID from their JWT token, unless they are a Super Admin (role 1).
func EnforceUnitID(c *gin.Context, requestedUnitID uint) uint {
	roleIDVal, exists := c.Get("roleID")
	if !exists {
		return requestedUnitID
	}
	
	roleID := getUintFromInterface(roleIDVal)
	if roleID == 1 {
		return requestedUnitID // Super admin can query any unit
	}

	unitIDVal, exists := c.Get("unitID")
	if !exists {
		return requestedUnitID
	}
	
	userUnitID := getUintFromInterface(unitIDVal)
	if userUnitID != 0 {
		return userUnitID // Override with user's actual unit ID
	}
	
	return requestedUnitID
}

func getUintFromInterface(val interface{}) uint {
	switch v := val.(type) {
	case uint:
		return v
	case int:
		return uint(v)
	case float64:
		return uint(v)
	}
	return 0
}
