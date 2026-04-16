package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// FeatureMiddleware blocks access to an endpoint if the feature is disabled.
// Usage: router.Use(middleware.FeatureMiddleware(cfg.FeaturePayroll))
func FeatureMiddleware(featureEnabled bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !featureEnabled {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Fitur ini tidak tersedia dalam paket Anda",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
