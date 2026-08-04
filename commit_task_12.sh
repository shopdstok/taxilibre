#!/bin/bash
# Script to commit changes for task 12

echo "Adding files for task 12..."
git add infrastructure/services.tf TASK_12_SUMMARY.md

echo "Committing changes..."
git commit -m "feat(infra): add AWS Cloud Map service discovery for ECS services"

echo "Pushing to remote..."
git push origin main

echo "Task 12 completed!"