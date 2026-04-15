package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type StakeholderConfig struct {
	ID           uint
	Role         string
	Name         string
	DisplayLabel string
}

func main() {
	dsn := "host=localhost user=postgres password=mysecretpassword dbname=sdit_sims port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var configs []StakeholderConfig
	db.Find(&configs)
	for _, c := range configs {
		fmt.Printf("ID: %d, Role: %s, Name: %s, Label: %s\n", c.ID, c.Role, c.Name, c.DisplayLabel)
	}
}
