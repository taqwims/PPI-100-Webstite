package routes

import (
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/delivery/http/handlers"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(
	api *gin.RouterGroup,
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	publicHandler *handlers.PublicHandler,
	midtransHandler *handlers.MidtransHandler,
	xenditHandler *handlers.XenditHandler,
	mayarHandler *handlers.MayarHandler,
	invoiceSignatureHandler *handlers.InvoiceSignatureHandler,
	schoolBankUsecase *usecase.SchoolBankUsecase,
	schoolSettingUsecase *usecase.SchoolSettingUsecase,
	studentHandler *handlers.StudentHandler,
) {
	// ── Feature Config (public, no auth) ──
	api.GET("/config/features", func(c *gin.Context) {
		bankAccounts, _ := schoolBankUsecase.GetActive()
		schoolInfo := schoolSettingUsecase.GetSchoolInfo()
		units, _ := schoolSettingUsecase.GetActiveUnits()
		foundations, _ := schoolSettingUsecase.GetFoundations()
		c.JSON(200, gin.H{
			"features":      cfg.FeatureMap(),
			"school":        schoolInfo,
			"bank_accounts": bankAccounts,
			"units":         units,
			"foundations":   foundations,
		})
	})

	if cfg.FeaturePublicWebsite {
		public := api.Group("/public")
		{
			public.GET("/teachers", publicHandler.GetTeachers)
			public.GET("/downloads", publicHandler.GetDownloads)
			public.GET("/alumni", publicHandler.GetAlumni)
			public.POST("/contact", publicHandler.SubmitContact)
		}
	}

	if cfg.FeaturePPDB {
		api.Group("/public").POST("/ppdb", publicHandler.RegisterPPDB)
	}

	// Public Units (for PPDB form and other public pages) — only active units
	api.GET("/public/units", func(c *gin.Context) {
		units, err := schoolSettingUsecase.GetActiveUnits()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, units)
	})

	// Payment Gateway Webhooks (public, no auth required)
	if cfg.FeatureMidtrans {
		api.POST("/midtrans/notification", midtransHandler.HandleNotification)
	}
	api.POST("/xendit/notification", xenditHandler.HandleNotification)
	api.POST("/mayar/notification", mayarHandler.HandleNotification)

	// Public Invoice Verification (no auth required)
	api.GET("/invoice/verify", invoiceSignatureHandler.VerifyInvoice)
	api.POST("/invoice/verify", invoiceSignatureHandler.VerifyInvoice)

	// Public IoT Device RFID Tap
	api.POST("/attendance/rfid-tap", studentHandler.RecordRFIDAttendance)

	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)
	}
}
