#!/bin/bash

# Update repository interface
sed -i '' '/SetActiveAcademicYear/a\
	TransferSavings(studentID, handledByID uuid.UUID, module string, direction string, amount float64, notes string) error\
' "backend/internal/repository/finance_extended_repository.go"

