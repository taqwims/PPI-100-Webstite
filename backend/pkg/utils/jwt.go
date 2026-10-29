package utils

import (
	"errors"
	"ppi-100-sis/internal/config"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID  uuid.UUID `json:"user_id"`
	RoleID  uint      `json:"role_id"`
	RoleIDs []uint    `json:"role_ids,omitempty"`
	UnitID  uint      `json:"unit_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID, roleID, unitID uint, cfg *config.Config, roleIDs ...uint) (string, error) {
	allRoleIDs := make([]uint, 0)
	roleMap := make(map[uint]bool)
	if roleID > 0 {
		allRoleIDs = append(allRoleIDs, roleID)
		roleMap[roleID] = true
	}
	for _, rid := range roleIDs {
		if rid > 0 && !roleMap[rid] {
			allRoleIDs = append(allRoleIDs, rid)
			roleMap[rid] = true
		}
	}

	claims := &Claims{
		UserID:  userID,
		RoleID:  roleID,
		RoleIDs: allRoleIDs,
		UnitID:  unitID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func ValidateToken(tokenString string, cfg *config.Config) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
