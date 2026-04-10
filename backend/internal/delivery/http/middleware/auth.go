package middleware

import (
	"net/http"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/pkg/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string

		// 1. Coba baca dari httpOnly cookie terlebih dahulu (lebih aman dari XSS)
		if cookie, err := c.Cookie("token"); err == nil && cookie != "" {
			tokenStr = cookie
		}

		// 2. Fallback ke Authorization Bearer header (backward compatibility)
		if tokenStr == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					tokenStr = parts[1]
				}
			}
		}

		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(tokenStr, cfg)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token: " + err.Error()})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID.String())
		c.Set("roleID", claims.RoleID)
		c.Set("unitID", claims.UnitID)
		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...int) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleIDVal, exists := c.Get("roleID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		var userRole int
		switch v := roleIDVal.(type) {
		case uint:
			userRole = int(v)
		case float64:
			userRole = int(v)
		case int:
			userRole = v
		}

		for _, role := range allowedRoles {
			if userRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: insufficient permissions"})
		c.Abort()
	}
}
